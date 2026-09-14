<?php

namespace Tests\Feature;

use App\Models\ApprovalNotification;
use App\Models\ApprovalRequest;
use App\Models\User;
use Database\Seeders\ApprovalDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApprovalWorkspaceTest extends TestCase
{
    use RefreshDatabase;

    private function person(string $role = 'employee'): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => $role, 'department' => 'Design'])->save();

        return $user;
    }

    private function payload(array $extra = []): array
    {
        return array_merge(['title' => 'Team equipment', 'description' => 'Equipment for the new design team.', 'type' => 'budget', 'priority' => 'normal', 'amount' => 15000, 'submit' => true], $extra);
    }

    private function create(User $user, array $extra = []): array
    {
        return $this->actingAs($user)->postJson('/api/approvals', $this->payload($extra))->assertCreated()->json();
    }

    public function test_api_requires_authentication(): void
    {
        $this->getJson('/api/approvals')->assertUnauthorized();
        $this->postJson('/api/approvals', $this->payload())->assertUnauthorized();
    }

    public function test_full_database_crud_with_version_and_history(): void
    {
        $u = $this->person();
        $a = $this->create($u, ['submit' => false]);
        $this->assertDatabaseHas('approval_requests', ['id' => $a['id'], 'status' => 'draft', 'amount' => 15000]);
        $this->getJson('/api/approvals/'.$a['id'])->assertOk()->assertJsonPath('events.0.action', 'created');
        $this->putJson('/api/approvals/'.$a['id'], $this->payload(['version' => 1, 'title' => 'Updated team equipment']))->assertOk()->assertJsonPath('version', 2)->assertJsonPath('status', 'pending');
        $this->deleteJson('/api/approvals/'.$a['id'], ['version' => 2])->assertNoContent();
        $this->assertSoftDeleted('approval_requests', ['id' => $a['id']]);
        $this->getJson('/api/approvals/'.$a['id'])->assertNotFound();
        $this->assertDatabaseHas('approval_events', ['approval_request_id' => $a['id'], 'action' => 'deleted']);
    }

    public function test_employees_cannot_read_or_edit_other_requests_or_review(): void
    {
        $a = $this->create($this->person());
        $this->actingAs($this->person());
        $this->getJson('/api/approvals')->assertJsonPath('total', 0);
        $this->getJson('/api/approvals/'.$a['id'])->assertNotFound();
        $this->putJson('/api/approvals/'.$a['id'], $this->payload(['version' => 1]))->assertNotFound();
        $this->deleteJson('/api/approvals/'.$a['id'], ['version' => 1])->assertNotFound();
        $this->postJson('/api/approvals/'.$a['id'].'/decision', ['version' => 1, 'decision' => 'approved'])->assertForbidden();
        $this->getJson('/api/approvals?scope=review')->assertForbidden();
    }

    public function test_manager_cannot_see_private_drafts_or_edit_employee_data(): void
    {
        $u = $this->person();
        $draft = $this->create($u, ['submit' => false]);
        $sent = $this->create($u);
        $this->actingAs($this->person('manager'));
        $this->getJson('/api/approvals/'.$draft['id'])->assertNotFound();
        $this->getJson('/api/approvals')->assertJsonPath('total', 1);
        $this->putJson('/api/approvals/'.$sent['id'], $this->payload(['version' => 1]))->assertForbidden();
        $this->deleteJson('/api/approvals/'.$sent['id'], ['version' => 1])->assertForbidden();
    }

    public function test_approval_is_atomic_notifies_owner_and_locks_approved_record(): void
    {
        $manager = $this->person('manager');
        $u = $this->person();
        $a = $this->create($u);
        $this->assertDatabaseHas('approval_notifications', ['user_id' => $manager->id, 'action' => 'submitted']);
        $this->actingAs($manager)->postJson('/api/approvals/'.$a['id'].'/decision', ['version' => 1, 'decision' => 'approved', 'note' => 'Proceed.'])->assertOk()->assertJsonPath('status', 'approved')->assertJsonPath('reviewer.id', $manager->id);
        $this->assertDatabaseHas('approval_notifications', ['user_id' => $u->id, 'action' => 'approved']);
        $this->postJson('/api/approvals/'.$a['id'].'/decision', ['version' => 1, 'decision' => 'rejected', 'note' => 'Too late'])->assertConflict();
        $this->actingAs($u)->putJson('/api/approvals/'.$a['id'], $this->payload(['version' => 2]))->assertConflict();
        $this->deleteJson('/api/approvals/'.$a['id'], ['version' => 2])->assertConflict();
        $this->getJson('/api/approvals/notifications')->assertJsonPath('unread', 1);
        $this->patchJson('/api/approvals/notifications/read')->assertJsonPath('unread', 0);
    }

    public function test_manager_cannot_self_approve(): void
    {
        $m = $this->person('manager');
        $a = $this->create($m);
        $this->postJson('/api/approvals/'.$a['id'].'/decision', ['version' => 1, 'decision' => 'approved'])->assertForbidden();
    }

    public function test_rejection_requires_reason_and_can_be_revised_and_resubmitted(): void
    {
        $u = $this->person();
        $a = $this->create($u);
        $this->actingAs($this->person('manager'));
        $this->postJson('/api/approvals/'.$a['id'].'/decision', ['version' => 1, 'decision' => 'rejected'])->assertUnprocessable()->assertJsonValidationErrors('note');
        $this->postJson('/api/approvals/'.$a['id'].'/decision', ['version' => 1, 'decision' => 'rejected', 'note' => 'Add a cost breakdown.'])->assertOk();
        $this->actingAs($u)->putJson('/api/approvals/'.$a['id'], $this->payload(['version' => 2]))->assertOk()->assertJsonPath('status', 'pending')->assertJsonPath('reviewer_id', null)->assertJsonPath('decision_note', null);
    }

    public function test_stale_edits_cannot_overwrite_new_data(): void
    {
        $a = $this->create($this->person());
        $this->putJson('/api/approvals/'.$a['id'], $this->payload(['version' => 1, 'title' => 'Latest title']))->assertOk();
        $this->putJson('/api/approvals/'.$a['id'], $this->payload(['version' => 1, 'title' => 'Stale title']))->assertConflict();
        $this->assertDatabaseHas('approval_requests', ['id' => $a['id'], 'title' => 'Latest title', 'version' => 2]);
    }

    public function test_type_specific_validation_and_protected_fields(): void
    {
        $u = $this->person();
        $this->actingAs($u);
        $this->postJson('/api/approvals', $this->payload(['amount' => -1]))->assertUnprocessable();
        $this->postJson('/api/approvals', $this->payload(['type' => 'leave', 'start_date' => '2026-10-10', 'end_date' => '2026-10-09']))->assertUnprocessable();
        $this->postJson('/api/approvals', $this->payload(['type' => 'document', 'document_url' => 'javascript:alert(1)']))->assertUnprocessable();
        $a = $this->create($u, ['status' => 'approved', 'user_id' => 999, 'reviewer_id' => 999, 'version' => 99, 'role' => 'manager']);
        $this->assertSame('pending', $a['status']);
        $this->assertSame($u->id, $a['user_id']);
        $this->assertSame(1, $a['version']);
        $this->patchJson('/api/approvals/preferences', ['name' => 'New Name', 'department' => 'Design', 'locale' => 'ja', 'role' => 'manager'])->assertOk()->assertJsonPath('role', 'employee');
    }

    public function test_comments_and_notification_isolation(): void
    {
        $u = $this->person();
        $a = $this->create($u);
        $m = $this->person('manager');
        $this->actingAs($m)->postJson('/api/approvals/'.$a['id'].'/comments', ['body' => 'Please share a quote.'])->assertOk();
        $n = ApprovalNotification::where('user_id', $u->id)->firstOrFail();
        $this->patchJson('/api/approvals/notifications/read', ['id' => $n->id])->assertOk();
        $this->assertNull($n->fresh()->read_at);
        $this->actingAs($this->person())->postJson('/api/approvals/'.$a['id'].'/comments', ['body' => 'Intruder'])->assertNotFound();
    }

    public function test_filters_summary_export_and_withdraw(): void
    {
        $u = $this->person();
        $a = $this->create($u, ['title' => '=SUM(1,2)']);
        $this->create($u, ['type' => 'document', 'title' => 'Contract review']);
        $this->getJson('/api/approvals?type=budget&search=SUM&per_page=1')->assertOk()->assertJsonPath('total', 1);
        $this->getJson('/api/approvals/summary')->assertOk()->assertJsonPath('total', 2)->assertJsonCount(6, 'weeks');
        $response = $this->get('/api/approvals/export?type=budget')->assertOk();
        $this->assertStringContainsString("'=SUM", $response->streamedContent());
        $this->assertStringNotContainsString('Contract review', $response->streamedContent());
        $this->postJson('/api/approvals/'.$a['id'].'/cancel', ['version' => 1])->assertOk()->assertJsonPath('status', 'cancelled');
        $this->postJson('/api/approvals/'.$a['id'].'/cancel', ['version' => 2])->assertConflict();
    }

    public function test_registration_does_not_allow_role_escalation(): void
    {
        $this->post('/register', ['name' => 'New employee', 'email' => 'new@example.test', 'password' => 'password123', 'password_confirmation' => 'password123', 'role' => 'manager'])->assertRedirect('/dashboard');
        $this->assertDatabaseHas('users', ['email' => 'new@example.test', 'role' => 'employee']);
    }

    public function test_demo_seeder_is_repeatable_and_has_no_self_approvals(): void
    {
        $this->seed(ApprovalDemoSeeder::class);
        $count = ApprovalRequest::count();
        $this->seed(ApprovalDemoSeeder::class);
        $this->assertSame($count, ApprovalRequest::count());
        $this->assertSame(0, ApprovalRequest::whereColumn('user_id', 'reviewer_id')->count());
    }

    public function test_account_deletion_cannot_cascade_into_approval_history(): void
    {
        $user = $this->person();
        $a = $this->create($user);
        $this->delete('/profile', ['password' => 'password'])->assertSessionHasErrors('password');
        $this->assertDatabaseHas('users', ['id' => $user->id]);
        $this->assertDatabaseHas('approval_requests', ['id' => $a['id']]);
    }

    public function test_activity_chart_excludes_drafts_and_uses_decision_dates(): void
    {
        $this->travelTo(now()->startOfWeek()->addDays(2));
        $user = $this->person();
        $this->create($user, ['submit' => false]);
        $item = $this->create($user);
        ApprovalRequest::find($item['id'])->update(['submitted_at' => now()->subWeeks(2)]);
        $this->actingAs($this->person('manager'))->postJson('/api/approvals/'.$item['id'].'/decision', ['version' => 1, 'decision' => 'approved'])->assertOk();
        $this->actingAs($user)->getJson('/api/approvals/summary')->assertOk()->assertJsonPath('weeks.5.total', 0)->assertJsonPath('weeks.5.approved', 1)->assertJsonPath('weeks.3.total', 1);
    }

    public function test_leave_and_document_requests_store_only_type_relevant_fields(): void
    {
        $u = $this->person();
        $leave = $this->create($u, ['type' => 'leave', 'start_date' => '2026-10-10', 'end_date' => '2026-10-12', 'document_url' => 'https://example.com']);
        $this->assertNull($leave['amount']);
        $this->assertNull($leave['document_url']);
        $document = $this->create($u,['type' => 'document', 'document_url' => 'https://example.com/policy', 'start_date' => '2026-10-10']);
        $this->assertNull($document['start_date']);
        $this->assertNull($document['amount']);
        $this->assertSame('https://example.com/policy',$document['document_url']);
    }
}
