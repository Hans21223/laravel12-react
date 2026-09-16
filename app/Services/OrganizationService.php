<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\OrganizationInvite;
use App\Models\OrganizationMembership;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrganizationService
{
    public function create(User $user, string $name): Organization
    {
        $org = DB::transaction(function () use ($user, $name) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            // Closed and failed setups do not count toward the limits.
            abort_if(Organization::where('owner_user_id', $user->id)->whereNotIn('status', ['closed', 'failed'])->count() >= config('tenancy.max_owned_organizations'), 422, 'Organization limit reached.');
            abort_if(Organization::whereNotIn('status', ['closed', 'failed'])->count() >= config('tenancy.max_organizations'), 503, 'Organization capacity reached.');

            return Organization::create(['uuid' => (string) Str::uuid(), 'name' => $name, 'owner_user_id' => $user->id]);
        });

        return $this->finish($org, $user);
    }

    // Provision (or re-run the idempotent schema migration for) an organization and make its owner a manager.
    public function finish(Organization $org, User $user): Organization
    {
        try {
            if ($org->database_credentials) {
                app(TenantContext::class)->activate($org);
                if (Artisan::call('migrate', ['--database' => 'tenant', '--path' => 'database/migrations/tenant', '--force' => true]) !== 0) {
                    throw new \RuntimeException('Tenant schema setup failed.');
                }
            } else {
                $this->provision($org);
            }
            DB::transaction(function () use ($org, $user) {
                OrganizationMembership::firstOrCreate(['organization_id' => $org->id, 'user_id' => $user->id], ['role' => 'manager', 'department' => 'Operations']);
                $org->update(['status' => 'ready']);
                $user->forceFill(['active_organization_id' => $org->id])->save();
            });

            return $org->fresh();
        } catch (\Throwable $error) {
            $org->update(['status' => 'failed']);
            report($error);
            abort(503, 'Organization setup could not finish. Your account is safe; contact the service administrator.');
        } finally {
            app(TenantContext::class)->clear();
        }
    }

    public function provision(Organization $org): void
    {
        if ($org->database_credentials) {
            throw new \RuntimeException('Database already provisioned.');
        }
        if (config('tenancy.driver') === 'sqlite' && ! app()->environment('production')) {
            $directory = storage_path('app/private/tenants');
            if (! is_dir($directory)) {
                mkdir($directory, 0700, true);
            }
            $path = $directory.'/'.$org->uuid.'.sqlite';
            if (file_exists($path)) {
                throw new \RuntimeException('Tenant file already exists.');
            }
            touch($path);
            $credentials = ['driver' => 'sqlite', 'database' => $path];
        } else {
            $result = Process::timeout(45)->run(['sudo', '-n', config('tenancy.provisioner'), $org->uuid]);
            if (! $result->successful()) {
                throw new \RuntimeException('Tenant database provisioning failed.');
            }
            $credentials = json_decode($result->output(), true, flags: JSON_THROW_ON_ERROR);
            if (($credentials['driver'] ?? null) !== 'mysql' || ! preg_match('/^ae_org_[a-f0-9]{32}$/', $credentials['database'] ?? '')) {
                throw new \RuntimeException('Invalid database provisioner response.');
            }
        }
        $org->update(['database_credentials' => $credentials]);
        app(TenantContext::class)->activate($org->fresh());
        $exit = Artisan::call('migrate', ['--database' => 'tenant', '--path' => 'database/migrations/tenant', '--force' => true]);
        if ($exit !== 0) {
            throw new \RuntimeException('Tenant schema setup failed.');
        }
    }

    public function join(User $user, string $key): Organization
    {
        return DB::transaction(function () use ($user, $key) {
            $invite = OrganizationInvite::where('key_hash', hash('sha256', trim($key)))->lockForUpdate()->first();
            if (! $invite || $invite->revoked_at || $invite->expires_at->isPast() || $invite->uses >= $invite->max_uses || ($invite->email && strcasecmp($invite->email, $user->email) !== 0)) {
                throw ValidationException::withMessages(['invitation_key' => 'This invitation is invalid, expired, used, or belongs to another email.']);
            }
            $org = Organization::whereKey($invite->organization_id)->where('status', 'ready')->firstOrFail();
            $membership = OrganizationMembership::where('organization_id', $org->id)->where('user_id', $user->id)->first();
            if ($membership) {
                abort_if($membership->suspended, 403, 'Membership is suspended.');
            } else {
                OrganizationMembership::create(['organization_id' => $org->id, 'user_id' => $user->id, 'role' => 'employee', 'department' => 'Operations']);
                $invite->increment('uses');
            }
            $user->forceFill(['active_organization_id' => $org->id])->save();

            return $org;
        });
    }
}
