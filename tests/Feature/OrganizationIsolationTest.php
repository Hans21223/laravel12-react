<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationInvite;
use App\Models\OrganizationMembership;
use App\Models\User;
use App\Services\OrganizationService;
use App\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

class OrganizationIsolationTest extends TestCase
{
    use RefreshDatabase;

    private array $tenantFiles = [];

    private array $mysqlDatabases = [];

    protected function setUp(): void
    {
        parent::setUp();
        config(['tenancy.enabled' => true, 'tenancy.driver' => 'sqlite']);
        if (getenv('AE_TEST_MYSQL')) {
            config(['tenancy.driver' => 'mysql']);
            Process::fake(function ($process) {
                $uuid = end($process->command);
                $database = 'ae_org_'.str_replace('-', '', $uuid);
                $root = new \PDO('mysql:host=127.0.0.1;port=3306', 'root', getenv('MYSQL_TEST_PASSWORD'));
                $root->exec("CREATE DATABASE `$database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $this->mysqlDatabases[] = $database;

                return Process::result(output: json_encode(['driver' => 'mysql', 'host' => '127.0.0.1', 'port' => '3306', 'database' => $database, 'username' => 'root', 'password' => getenv('MYSQL_TEST_PASSWORD'), 'unix_socket' => '']));
            });
        }
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        foreach ($this->tenantFiles as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }
        foreach ($this->mysqlDatabases as $database) {
            $root = new \PDO('mysql:host=127.0.0.1;port=3306', 'root', getenv('MYSQL_TEST_PASSWORD'));
            $root->exec("DROP DATABASE `$database`");
        }
        parent::tearDown();
    }

    private function organization(User $user, string $name): Organization
    {
        $org = app(OrganizationService::class)->create($user, $name);
        $this->tenantFiles[] = $org->database_credentials['database'];

        return $org;
    }

    private function actor(User $user, Organization $org): static
    {
        $this->flushSession();
        $this->actingAs($user->fresh())->withSession(['organization_id' => $org->id])->withHeader('X-Organization-ID', (string) $org->id);

        return $this;
    }

    private function requestData(): array
    {
        return ['title' => 'Organization private request', 'description' => 'This record belongs only to its organization.', 'type' => 'budget', 'amount' => 1234, 'priority' => 'normal', 'submit' => true];
    }

    public function test_separate_databases_and_membership_roles_cannot_cross_organizations(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $a = $this->organization($alice, 'Organization A');
        $b = $this->organization($bob, 'Organization B');
        $this->assertNotSame($a->database_credentials['database'], $b->database_credentials['database']);
        $row = $this->actor($alice, $a)->postJson('/api/approvals', $this->requestData())->assertCreated()->json();
        $this->actor($bob, $b)->getJson('/api/approvals')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/approvals/'.$row['id'])->assertNotFound();
        $this->postJson('/api/approvals/'.$row['id'].'/decision', ['version' => 1, 'decision' => 'approved'])->assertNotFound();
        $this->postJson('/api/organizations/'.$a->id.'/switch')->assertNotFound();
        $this->withHeader('X-Organization-ID', (string) $a->id)->getJson('/api/approvals')->assertConflict();
        $this->actor($alice, $a)->getJson('/api/organization/database')->assertOk()->assertJsonPath('engine', getenv('AE_TEST_MYSQL') ? 'mysql' : 'sqlite')->assertJsonPath('rows.total', 1)->assertJsonPath('read_only', true);
        $this->getJson('/api/organization/database?table=users')->assertUnprocessable();
        $this->getJson('/api/organization/database?table=direct_messages')->assertUnprocessable();
    }

    public function test_join_requires_a_single_use_key_and_never_grants_manager_access(): void
    {
        $owner = User::factory()->create();
        $employee = User::factory()->create();
        $third = User::factory()->create();
        $org = $this->organization($owner, 'Invited Company');
        $invite = $this->actor($owner, $org)->postJson('/api/organization/invites', ['label' => 'New employee', 'email' => $employee->email, 'max_uses' => 1, 'days' => 1])->assertCreated()->json();
        $this->assertArrayNotHasKey('key_hash', $invite['invitation']);
        $this->flushSession();
        $this->actingAs($third)->postJson('/api/organizations/join', ['invitation_key' => $invite['key']])->assertUnprocessable();
        $this->flushSession();
        $this->actingAs($employee)->postJson('/api/organizations/join', ['invitation_key' => $invite['key'], 'role' => 'manager'])->assertOk();
        $this->assertDatabaseHas('organization_memberships', ['organization_id' => $org->id, 'user_id' => $employee->id, 'role' => 'employee']);
        $this->actor($employee, $org)->getJson('/api/organization/database')->assertForbidden();
        $this->postJson('/api/organization/invites', ['label' => 'Bad invite', 'max_uses' => 1, 'days' => 1])->assertForbidden();
        $this->getJson('/api/organization/members')->assertOk()->assertJsonPath('total', 2);
        $this->flushSession();
        $this->actingAs($third)->postJson('/api/organizations/join', ['invitation_key' => $invite['key']])->assertUnprocessable();
        $this->actor($owner, $org)->withHeader('X-AE-Debug', '1')->getJson('/api/approvals')->assertOk()->assertHeader('X-AE-Trace');
    }

    public function test_direct_messages_are_private_and_suspended_members_lose_access(): void
    {
        $a = User::factory()->create();
        $b = User::factory()->create();
        $c = User::factory()->create();
        $org = $this->organization($a, 'Private Chat');
        foreach ([$b, $c] as $user) {
            OrganizationMembership::create(['organization_id' => $org->id, 'user_id' => $user->id]);
        }
        $this->actor($a, $org)->postJson('/api/team/messages/'.$b->id, ['body' => 'Private message for B'])->assertCreated();
        $this->actor($c, $org)->getJson('/api/team/messages/'.$b->id)->assertOk()->assertJsonCount(0);
        $this->actor($b, $org)->getJson('/api/team/messages/'.$a->id)->assertOk()->assertJsonPath('0.body', 'Private message for B');
        app(TenantContext::class)->activate($org);
        $stored = app(TenantContext::class)->db()->table('direct_messages')->value('body');
        $this->assertStringNotContainsString('Private message for B', $stored);
        app(TenantContext::class)->clear();
        $member = OrganizationMembership::where('organization_id', $org->id)->where('user_id', $b->id)->first();
        $this->actor($a, $org)->patchJson('/api/organization/members/'.$member->id, ['role' => 'employee', 'suspended' => true])->assertOk();
        $this->actor($b, $org)->getJson('/api/approvals')->assertConflict();
        $this->actor($a, $org)->postJson('/api/team/messages/'.$b->id, ['body' => 'Not allowed'])->assertNotFound();
    }

    public function test_calls_require_membership_participation_and_correct_signaling_order(): void
    {
        config(['tenancy.turn_url' => 'turn:localhost:3478', 'tenancy.turn_secret' => 'test-only-secret']);
        $owner = User::factory()->create();
        $peer = User::factory()->create();
        $outsider = User::factory()->create();
        $org = $this->organization($owner, 'Call Team');
        foreach ([$peer, $outsider] as $user) {
            OrganizationMembership::create(['organization_id' => $org->id, 'user_id' => $user->id]);
        }
        $call = $this->actor($owner, $org)->postJson('/api/team/calls', ['recipient_id' => $peer->id, 'mode' => 'video'])->assertCreated()->json();
        $id = $call['id'];
        $this->postJson('/api/team/calls', ['recipient_id' => $outsider->id, 'mode' => 'audio'])->assertConflict();
        $this->patchJson('/api/team/calls/'.$id, ['action' => 'accept'])->assertConflict();
        $offer = ['type' => 'offer', 'payload' => ['sdp' => 'v=0 synthetic test SDP']];
        $this->postJson('/api/team/calls/'.$id.'/signals', $offer)->assertNoContent();
        $this->actor($outsider, $org)->getJson('/api/team/calls/'.$id)->assertNotFound();
        $this->patchJson('/api/team/calls/'.$id, ['action' => 'end'])->assertNotFound();
        $this->actor($peer, $org)->postJson('/api/team/calls/'.$id.'/signals', $offer)->assertForbidden();
        $this->patchJson('/api/team/calls/'.$id, ['action' => 'accept'])->assertOk()->assertJsonPath('status', 'accepted');
        $this->getJson('/api/team/calls/'.$id)->assertOk()->assertJsonPath('signals.0.payload.sdp', 'v=0 synthetic test SDP');
        $this->postJson('/api/team/calls/'.$id.'/signals', ['type' => 'answer', 'payload' => ['sdp' => 'v=0 synthetic answer']])->assertNoContent();
        $this->patchJson('/api/team/calls/'.$id, ['action' => 'end'])->assertOk();
        $this->actor($owner, $org)->postJson('/api/team/calls/'.$id.'/signals', $offer)->assertConflict();
        $this->getJson('/api/team/calls/'.$id)->assertOk()->assertJsonCount(0, 'signals');
    }

    public function test_settings_reset_and_debug_trace_do_not_expose_private_data(): void
    {
        $owner = User::factory()->create(['preferences' => ['theme' => 'dark', 'visual_debug' => true], 'locale' => 'ja']);
        $org = $this->organization($owner, 'Debug Team');
        $response = $this->actor($owner, $org)->withHeader('X-AE-Debug', '1')->postJson('/api/approvals', $this->requestData())->assertCreated();
        $trace = base64_decode($response->headers->get('X-AE-Trace'));
        $this->assertStringNotContainsString('Organization private request', $trace);
        $this->assertStringNotContainsString('password', $trace);
        $this->assertStringContainsString('INSERT', $trace);
        $this->postJson('/api/approvals/preferences/reset')->assertOk();
        $this->assertSame('en', $owner->fresh()->locale);
        $this->assertSame(false, $owner->fresh()->preferences['visual_debug']);
        $this->assertSame('light', $owner->fresh()->preferences['theme']);
        $this->getJson('/api/approvals')->assertOk()->assertJsonPath('total', 1);
    }

    public function test_members_with_pending_assignments_cannot_be_demoted_or_suspended(): void
    {
        $owner = User::factory()->create();
        $reviewer = User::factory()->create();
        $employee = User::factory()->create();
        $org = $this->organization($owner, 'Review Team');
        $membership = OrganizationMembership::create(['organization_id' => $org->id, 'user_id' => $reviewer->id, 'role' => 'manager']);
        OrganizationMembership::create(['organization_id' => $org->id, 'user_id' => $employee->id]);
        $row = $this->actor($employee, $org)->postJson('/api/approvals', [...$this->requestData(), 'route_mode' => 'sequential', 'reviewer_ids' => [$reviewer->id, $owner->id]])->assertCreated()->json();
        $url = '/api/organization/members/'.$membership->id;
        $this->actor($owner, $org)->patchJson($url, ['role' => 'employee', 'suspended' => false])->assertConflict();
        $this->patchJson($url, ['role' => 'manager', 'suspended' => true])->assertConflict();
        $backup = User::factory()->create();
        OrganizationMembership::create(['organization_id' => $org->id, 'user_id' => $backup->id, 'role' => 'manager']);
        $reassign = '/api/approvals/'.$row['id'].'/steps/'.$row['steps'][0]['id'].'/reassign';
        $this->actor($backup, $org)->postJson($reassign, ['version' => $row['version'], 'reviewer_id' => $backup->id])->assertForbidden();
        $this->actor($owner, $org)->postJson($reassign, ['version' => $row['version'], 'reviewer_id' => $backup->id])->assertOk()->assertJsonPath('steps.0.reviewer_id', $backup->id);
        $this->patchJson($url, ['role' => 'employee', 'suspended' => false])->assertOk();
    }

    public function test_revoked_and_expired_invites_are_rejected_and_owner_cannot_be_suspended(): void
    {
        $owner = User::factory()->create();
        $joiner = User::factory()->create();
        $org = $this->organization($owner, 'Protected Team');
        $inv = $this->actor($owner, $org)->postJson('/api/organization/invites', ['label' => 'Revoked', 'max_uses' => 2, 'days' => 1])->assertCreated()->json();
        $this->deleteJson('/api/organization/invites/'.$inv['invitation']['id'])->assertNoContent();
        $own = OrganizationMembership::where('organization_id', $org->id)->where('user_id', $owner->id)->sole();
        $this->patchJson('/api/organization/members/'.$own->id, ['role' => 'employee', 'suspended' => true])->assertConflict();
        $this->flushSession();
        $this->actingAs($joiner)->postJson('/api/organizations/join', ['invitation_key' => $inv['key']])->assertUnprocessable();
        $inv = $this->actor($owner, $org)->postJson('/api/organization/invites', ['label' => 'Expired', 'max_uses' => 2, 'days' => 1])->assertCreated()->json();
        OrganizationInvite::find($inv['invitation']['id'])->update(['expires_at' => now()->subMinute()]);
        $this->flushSession();
        $this->actingAs($joiner)->postJson('/api/organizations/join', ['invitation_key' => $inv['key']])->assertUnprocessable();
    }

    public function test_owner_can_rename_transfer_close_and_members_can_leave(): void
    {
        $owner = User::factory()->create();
        $manager = User::factory()->create();
        $employee = User::factory()->create();
        $org = $this->organization($owner, 'Lifecycle Team');
        $managerMembership = OrganizationMembership::create(['organization_id' => $org->id, 'user_id' => $manager->id, 'role' => 'manager']);
        $employeeMembership = OrganizationMembership::create(['organization_id' => $org->id, 'user_id' => $employee->id]);
        $this->actor($employee, $org)->patchJson('/api/organization', ['name' => 'Taken Over'])->assertForbidden();
        $this->actor($owner, $org)->patchJson('/api/organization', ['name' => 'Lifecycle Division'])->assertOk()->assertJsonPath('name', 'Lifecycle Division');
        $this->postJson('/api/organization/leave')->assertConflict();
        $this->postJson('/api/organization/transfer', ['membership' => $employeeMembership->id])->assertNotFound();
        $this->postJson('/api/organization/transfer', ['membership' => $managerMembership->id])->assertOk()->assertJsonPath('owner_user_id', $manager->id);
        $this->patchJson('/api/organization', ['name' => 'Not mine anymore'])->assertForbidden();
        $this->actor($owner, $org)->postJson('/api/organization/leave')->assertNoContent();
        $this->assertDatabaseMissing('organization_memberships', ['organization_id' => $org->id, 'user_id' => $owner->id]);
        $this->assertNull($owner->fresh()->active_organization_id);
        $this->actor($owner, $org)->getJson('/api/approvals')->assertConflict();
        $this->actor($manager, $org)->deleteJson('/api/organization', ['confirm_name' => 'Wrong name'])->assertUnprocessable();
        $this->deleteJson('/api/organization', ['confirm_name' => 'Lifecycle Division'])->assertNoContent();
        $this->assertDatabaseHas('organizations', ['id' => $org->id, 'status' => 'closed']);
        $this->actor($employee, $org)->getJson('/api/approvals')->assertConflict();
        $this->flushSession();
        $this->actingAs($manager->fresh())->delete('/profile', ['password' => 'password'])->assertRedirect('/');
        $this->assertNull($manager->fresh());
        $this->assertNull($org->fresh()->owner_user_id);
    }

    public function test_owners_and_active_members_must_leave_before_deleting_accounts(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $org = $this->organization($owner, 'Account Rules');
        OrganizationMembership::create(['organization_id' => $org->id, 'user_id' => $member->id]);
        $this->flushSession();
        $this->actingAs($owner->fresh())->from('/approvals')->delete('/profile', ['password' => 'password'])->assertSessionHasErrors(['account' => 'owner']);
        $this->actingAs($member->fresh())->from('/approvals')->delete('/profile', ['password' => 'password'])->assertSessionHasErrors(['account' => 'member']);
        $this->assertNotNull($owner->fresh());
        $this->assertNotNull($member->fresh());
    }

    public function test_failed_setups_are_visible_and_can_be_retried_or_removed(): void
    {
        if (getenv('AE_TEST_MYSQL')) {
            $this->markTestSkipped('Uses the local SQLite provisioner.');
        }
        $owner = User::factory()->create();
        config(['tenancy.driver' => 'mysql']);
        Process::fake(fn () => Process::result(exitCode: 1));
        $this->actingAs($owner)->postJson('/api/organizations', ['name' => 'Broken Setup'])->assertStatus(503);
        $this->postJson('/api/organizations', ['name' => 'Second Broken'])->assertStatus(503);
        $failed = Organization::where('owner_user_id', $owner->id)->where('status', 'failed')->orderBy('id')->get();
        $this->assertCount(2, $failed);
        $this->getJson('/api/organizations')->assertOk()->assertJsonCount(2)->assertJsonPath('0.status', 'failed');
        config(['tenancy.driver' => 'sqlite']);
        $this->postJson('/api/organizations/'.$failed[0]->id.'/retry')->assertOk()->assertJsonPath('status', 'ready');
        $this->tenantFiles[] = $failed[0]->fresh()->database_credentials['database'];
        $this->assertDatabaseHas('organization_memberships', ['organization_id' => $failed[0]->id, 'user_id' => $owner->id, 'role' => 'manager']);
        $this->deleteJson('/api/organizations/'.$failed[1]->id)->assertNoContent();
        $this->assertDatabaseMissing('organizations', ['id' => $failed[1]->id]);
        $this->actingAs(User::factory()->create())->deleteJson('/api/organizations/'.$failed[0]->id)->assertNotFound();
    }
}
