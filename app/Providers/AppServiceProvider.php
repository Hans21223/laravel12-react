<?php

namespace App\Providers;

use App\Services\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TenantContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        DB::listen(function ($event) {
            if (! app()->bound('request')) {
                return;
            }
            $r = request();
            $trace = $r->attributes->get('ae_trace');
            if (! $trace) {
                return;
            }
            $trace['queries']++;
            preg_match('/^\s*(SELECT|INSERT|UPDATE|DELETE|PRAGMA)/i', $event->sql, $operation);
            if (isset($operation[1])) {
                $trace['operations'] = array_values(array_unique([...$trace['operations'], strtoupper($operation[1])]));
            }
            preg_match_all('/\b(?:FROM|INTO|UPDATE|JOIN)\s+[`"]?([a-z_]+)/i', $event->sql, $tables);
            $allowed = ['users', 'organization_memberships', 'organizations', 'approval_requests', 'approval_steps', 'approval_events', 'approval_attachments', 'approval_notifications', 'direct_messages', 'workspace_calls', 'call_signals'];
            $trace['tables'] = array_values(array_unique([...$trace['tables'], ...array_intersect($tables[1] ?? [], $allowed)]));
            $r->attributes->set('ae_trace', $trace);
        });
        Vite::prefetch(concurrency: 3);
    }
}
