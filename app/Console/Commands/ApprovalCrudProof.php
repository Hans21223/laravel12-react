<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Services\TenantContext;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ApprovalCrudProof extends Command
{
    protected $signature = 'approvals:crud-proof {id : ID of a synthetic CRUD verification request}';

    protected $description = 'Read a synthetic demonstration row directly from SQL, including its soft-delete marker';

    public function handle(): int
    {
        $id = (string) $this->argument('id');
        if (! ctype_digit($id) || (int) $id < 1) {
            $this->error('A positive request ID is required.');

            return self::FAILURE;
        }
        // Explicit column and title allowlists keep real request content out of CI logs.
        $db = DB::connection();
        if (config('tenancy.enabled')) {
            $org = Organization::where('is_legacy', true)->sole();
            app(TenantContext::class)->activate($org);
            $db = app(TenantContext::class)->db();
        }
        $row = $db->table('approval_requests')->where('id', $id)->where('title', 'like', 'CRUD verification %')
            ->first(['id', 'title', 'amount', 'status', 'version', 'created_at', 'updated_at', 'deleted_at']);
        if (! $row) {
            $this->error('Synthetic verification record not found. No other records were read.');

            return self::FAILURE;
        }
        $events = $db->table('approval_events')->where('approval_request_id', $id)->orderBy('id')->get(['action', 'created_at']);
        $this->line(json_encode([
            'database_driver' => $db->getDriverName(), 'source' => 'Direct SQL via Laravel DB::table; no Eloquent soft-delete scope',
            'verified_at_utc' => now()->utc()->toIso8601String(), 'row' => $row, 'events' => $events,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return self::SUCCESS;
    }
}
