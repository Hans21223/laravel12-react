<?php

namespace App\Services;

use App\Models\Organization;
use Illuminate\Support\Facades\DB;

class TenantContext
{
    public ?Organization $organization = null;

    public function activate(Organization $organization): void
    {
        $this->clear();
        $this->organization = $organization;
        $credentials = $organization->database_credentials;
        if ($credentials) {
            $driver = $credentials['driver'];
            config(['database.connections.tenant' => [...config('database.connections.'.$driver), ...$credentials, 'url' => null]]);
            DB::purge('tenant');
        }
    }

    public function connectionName(): string
    {
        if (! config('tenancy.enabled')) {
            return config('database.default');
        }
        abort_unless($this->organization, 409, 'Choose an organization first.');

        return $this->organization->database_credentials ? 'tenant' : config('database.default');
    }

    public function db()
    {
        return DB::connection($this->connectionName());
    }

    public function clear(): void
    {
        DB::purge('tenant');
        $this->organization = null;
    }
}
