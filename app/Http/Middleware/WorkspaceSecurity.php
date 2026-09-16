<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class WorkspaceSecurity
{
    public function handle(Request $request, Closure $next)
    {
        if (!config('tenancy.enabled') && $request->is('organizations', 'api/organizations', 'api/organizations/*', 'api/organization/*', 'api/team/*')) {
            abort(404);
        }
        if (config('tenancy.enabled') && $request->is('drone-system', 'fleet', 'drones', 'drones/*', 'api/drones', 'api/drones/*', 'quiz4', 'smart-door', 'mini-rts')) {
            abort(404);
        }
        $response = $next($request);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
        if ($request->is('api/*') || $request->user()) {
            $response->headers->set('Cache-Control', 'private, no-store');
        }

        return $response;
    }
}
