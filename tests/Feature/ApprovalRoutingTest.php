<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApprovalRoutingTest extends TestCase
{
    use RefreshDatabase;

    private function manager(): User
    {
        return User::factory()->create(['role' => 'manager'])->fresh();
    }

    private function payload(array $ids, array $extra = []): array
    {
        return [...['title' => 'Sequential equipment review', 'description' => 'Equipment purchase with two independent reviewers.', 'type' => 'budget', 'amount' => 50000, 'priority' => 'high', 'submit' => true, 'route_mode' => 'sequential', 'reviewer_ids' => $ids], ...$extra];
    }

    public function test_only_current_reviewer_can_act_and_final_stage_completes_request(): void
    {
        $owner = User::factory()->create()->fresh();
        $first = $this->manager();
        $second = $this->manager();
        $outsider = $this->manager();
        $a = $this->actingAs($owner)->postJson('/api/approvals', $this->payload([$first->id, $second->id]))->assertCreated()->assertJsonPath('steps.0.status', 'pending')->assertJsonPath('steps.1.status', 'waiting')->json();
        $url = '/api/approvals/'.$a['id'];
        $this->assertDatabaseHas('approval_steps', ['approval_request_id' => $a['id'], 'position' => 1, 'reviewer_id' => $first->id, 'status' => 'pending']);
        $this->assertDatabaseMissing('approval_notifications', ['user_id' => $second->id]);
        $this->actingAs($second)->getJson('/api/approvals?scope=review')->assertJsonPath('total', 0);
        $this->postJson($url.'/decision', ['version' => 1, 'decision' => 'approved'])->assertForbidden();
        $this->actingAs($outsider)->postJson($url.'/decision', ['version' => 1, 'decision' => 'approved'])->assertForbidden();
        $this->actingAs($first)->getJson('/api/approvals/summary')->assertJsonPath('review_count', 1);
        $this->postJson($url.'/decision', ['version' => 1, 'decision' => 'approved', 'note' => 'Technical check passed.'])->assertOk()->assertJsonPath('status', 'pending')->assertJsonPath('steps.0.status', 'approved')->assertJsonPath('steps.1.status', 'pending')->assertJsonPath('decided_at', null)->assertJsonPath('version', 2);
        $this->assertDatabaseHas('approval_notifications', ['user_id' => $second->id, 'action' => 'submitted']);
        $this->assertDatabaseHas('approval_notifications', ['user_id' => $owner->id, 'action' => 'stage_approved']);
        $this->postJson($url.'/decision', ['version' => 2, 'decision' => 'approved'])->assertForbidden();
        $this->actingAs($second)->getJson('/api/approvals?scope=review')->assertJsonPath('total', 1);
        $this->postJson($url.'/decision', ['version' => 1, 'decision' => 'approved'])->assertConflict();
        $this->postJson($url.'/decision', ['version' => 2, 'decision' => 'approved'])->assertOk()->assertJsonPath('status', 'approved')->assertJsonPath('steps.1.status', 'approved')->assertJsonPath('reviewer_id', $second->id);
        $this->assertDatabaseHas('approval_requests', ['id' => $a['id'], 'status' => 'approved', 'version' => 3]);
        $this->assertDatabaseHas('approval_notifications', ['user_id' => $owner->id, 'action' => 'approved']);
    }

    public function test_edits_reset_the_route_and_retain_previous_decisions(): void
    {
        $owner = User::factory()->create()->fresh();
        $first = $this->manager();
        $second = $this->manager();
        $payload = $this->payload([$first->id, $second->id]);
        $a = $this->actingAs($owner)->postJson('/api/approvals', $payload)->assertCreated()->json();
        $url = '/api/approvals/'.$a['id'];
        $this->actingAs($first)->postJson($url.'/decision', ['version' => 1, 'decision' => 'approved'])->assertOk();
        $this->actingAs($owner)->putJson($url, [...$payload, 'version' => 2, 'amount' => 60000])->assertOk()->assertJsonPath('approval_round', 2)->assertJsonCount(4, 'steps');
        $this->assertDatabaseHas('approval_steps', ['approval_request_id' => $a['id'], 'round' => 1, 'position' => 1, 'status' => 'approved']);
        $this->assertDatabaseHas('approval_steps', ['approval_request_id' => $a['id'], 'round' => 1, 'position' => 2, 'status' => 'superseded']);
        $this->assertDatabaseHas('approval_steps', ['approval_request_id' => $a['id'], 'round' => 2, 'position' => 1, 'status' => 'pending']);
        $this->actingAs($second)->postJson($url.'/decision', ['version' => 3, 'decision' => 'approved'])->assertForbidden();
        $this->actingAs($first)->postJson($url.'/decision', ['version' => 3, 'decision' => 'rejected', 'note' => 'Please revise the amount.'])->assertOk()->assertJsonPath('status', 'rejected')->assertJsonPath('steps.3.status', 'skipped');
        $this->actingAs($owner)->putJson($url, [...$payload, 'version' => 4])->assertOk()->assertJsonPath('status', 'pending')->assertJsonPath('approval_round', 3)->assertJsonPath('steps.4.status', 'pending');
    }

    public function test_route_cannot_include_duplicates_employees_self_or_unvalidated_ids(): void
    {
        $owner = $this->manager();
        $first = $this->manager();
        $second = $this->manager();
        $employee = User::factory()->create()->fresh();
        $this->actingAs($owner);
        foreach ([[$first->id], [$first->id, $first->id], [$first->id, $employee->id], [$owner->id, $first->id], [$first->id, 99999], [4 => $first->id, 8 => $second->id]] as $ids) {
            $this->postJson('/api/approvals', $this->payload($ids))->assertUnprocessable();
        }
        $a = $this->postJson('/api/approvals', $this->payload([$first->id, $second->id], ['submit' => false]))->assertCreated()->json();
        $payload = $this->payload([$employee->id, $owner->id], ['version' => 1]);
        unset($payload['route_mode']);
        $this->putJson('/api/approvals/'.$a['id'], $payload)->assertOk()->assertJsonPath('approval_round', 1)->assertJsonPath('steps.0.reviewer_id', $first->id)->assertJsonPath('steps.1.reviewer_id', $second->id);
        $this->getJson('/api/approvals/reviewers')->assertOk()->assertJsonCount(2)->assertJsonMissing(['id' => $owner->id])->assertJsonMissing(['email' => $first->email]);
    }

    public function test_deleting_and_withdrawing_close_outstanding_stages(): void
    {
        $owner = User::factory()->create()->fresh();
        $payload = $this->payload([$this->manager()->id, $this->manager()->id]);
        $a = $this->actingAs($owner)->postJson('/api/approvals', $payload)->assertCreated()->json();
        $this->postJson('/api/approvals/'.$a['id'].'/cancel', ['version' => 1])->assertOk()->assertJsonPath('steps.0.status', 'skipped')->assertJsonPath('steps.1.status', 'skipped');
        $b = $this->postJson('/api/approvals', $payload)->assertCreated()->json();
        $this->deleteJson('/api/approvals/'.$b['id'], ['version' => 1])->assertNoContent();
        $this->assertSoftDeleted('approval_requests', ['id' => $b['id']]);
        $this->assertDatabaseMissing('approval_steps', ['approval_request_id' => $b['id'], 'status' => 'pending']);
    }
}
