<?php

namespace App\Http\Middleware;

use App\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;

class VisualRequestTrace
{
    public function handle(Request $r, Closure $next)
    {
        if (! $r->user() || ! $r->is('api/*') || $r->header('X-AE-Debug') !== '1') {
            return $next($r);
        }
        $start = microtime(true);
        $r->attributes->set('ae_trace', ['queries' => 0, 'operations' => [], 'tables' => []]);
        $response = $next($r);
        $trace = $r->attributes->get('ae_trace');
        $trace['duration_ms'] = round((microtime(true) - $start) * 1000, 1);
        $trace['engine'] = app(TenantContext::class)->organization ? app(TenantContext::class)->db()->getDriverName() : config('database.default');
        $trace['organization_id'] = app(TenantContext::class)->organization?->id;
        $trace['route'] = $r->route()?->uri();
        $response->headers->set('X-AE-Trace', base64_encode(json_encode($trace)));
        $r->attributes->remove('ae_trace');

        return $response;
    }
}
