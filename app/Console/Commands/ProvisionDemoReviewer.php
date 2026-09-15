<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ProvisionDemoReviewer extends Command
{
    protected $signature = 'approvals:demo-reviewer';

    protected $description = 'Provision the dedicated finance demo reviewer using AE_DEMO_REVIEWER_HASH';

    public function handle(): int
    {
        $hash = getenv('AE_DEMO_REVIEWER_HASH');
        if (! $hash || (password_get_info($hash)['algoName'] ?? 'unknown') === 'unknown') {
            $this->error('An administrator-supplied password hash is required. No accounts were changed.');

            return self::FAILURE;
        }

        return DB::transaction(function () use ($hash) {
            $user = User::where('email', 'finance-reviewer@accord.test')->first();
            if ($user) {
                if ($user->name !== 'Finance Demo Reviewer' || ! hash_equals($user->password, $hash)) {
                    $this->error('An existing account does not match this provisioning request. No changes were made.');

                    return self::FAILURE;
                }
            } else {
                $user = new User;
                $user->forceFill(['name' => 'Finance Demo Reviewer', 'email' => 'finance-reviewer@accord.test', 'password' => $hash, 'department' => 'Finance', 'locale' => 'en']);
            }
            $user->forceFill(['role' => 'manager'])->save();
            $this->info('Dedicated finance reviewer ready. Password not logged.');

            return self::SUCCESS;
        });
    }
}
