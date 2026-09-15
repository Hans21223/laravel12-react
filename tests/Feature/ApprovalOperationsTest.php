<?php

namespace Tests\Feature;

use App\Models\ApprovalRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ApprovalOperationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_sql_proof_restricts_output_to_synthetic_records_and_can_read_soft_deleted_rows(): void
    {
        $owner = User::factory()->create();
        $row = ApprovalRequest::create(['user_id' => $owner->id, 'department' => 'Design', 'title' => 'Confidential real request', 'description' => 'Private content', 'type' => 'budget', 'amount' => 20]);
        $this->artisan('approvals:crud-proof', ['id' => $row->id])->expectsOutput('Synthetic verification record not found. No other records were read.')->assertFailed();
        $this->artisan('approvals:crud-proof', ['id' => '1; whoami'])->assertFailed();
        $row->update(['title' => 'CRUD verification test', 'deleted_at' => now()]);
        $this->withoutMockingConsoleOutput();
        $this->assertSame(0, \Illuminate\Support\Facades\Artisan::call('approvals:crud-proof', ['id' => $row->id]));
        $proof = json_decode(\Illuminate\Support\Facades\Artisan::output(), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame('sqlite', $proof['database_driver']);
        $this->assertNotNull($proof['row']['deleted_at']);
    }

    public function test_demo_reviewer_provisioning_requires_a_hash_and_never_overwrites_an_unrelated_account(): void
    {
        $previous = getenv('AE_DEMO_REVIEWER_HASH');
        try {
            putenv('AE_DEMO_REVIEWER_HASH=');
            $this->artisan('approvals:demo-reviewer')->assertFailed();
            $this->assertDatabaseCount('users', 0);
            $hash = Hash::make('A unique local test password');
            putenv('AE_DEMO_REVIEWER_HASH='.$hash);
            $this->artisan('approvals:demo-reviewer')->assertSuccessful();
            $this->artisan('approvals:demo-reviewer')->assertSuccessful();
            $this->assertDatabaseCount('users', 1);
            $this->assertDatabaseHas('users', ['email' => 'finance-reviewer@accord.test', 'role' => 'manager', 'password' => $hash]);
            User::first()->forceFill(['name' => 'Another account', 'role' => 'employee'])->save();
            $this->artisan('approvals:demo-reviewer')->assertFailed();
            $this->assertDatabaseHas('users', ['role' => 'employee', 'name' => 'Another account', 'password' => $hash]);
        } finally {
            putenv($previous === false ? 'AE_DEMO_REVIEWER_HASH' : 'AE_DEMO_REVIEWER_HASH='.$previous);
        }
    }
}
