<?php

namespace App\Http\Middleware;

use App\Models\OrganizationMembership;
use App\Services\TenantContext;
use Closure;
use Illuminate\Http\Request;

class UseOrganization
{
    public function handle(Request $request, Closure $next)
    {
        if (! config('tenancy.enabled')) {
            return $next($request);
        }
        $context = app(TenantContext::class);
        $context->clear();
        $id = $request->session()->get('organization_id', $request->user()?->active_organization_id);
        $membership = OrganizationMembership::with('organization')->where('user_id', $request->user()->id)->where('organization_id', $id)->where('suspended', false)->first();
        if (! $membership || $membership->organization->status !== 'ready') {
            if ($request->expectsJson()) {
                abort(409, 'Choose an organization first.');
            }

            return redirect('/organizations');
        }
        $header = $request->header('X-Organization-ID');
        if ($request->isMethod('GET') && ($request->is('api/approvals/avatars/*') || $request->is('api/approvals/*/attachments/*'))) {
            $header ??= $request->query('organization_id');
        }
        if ($request->is('api/*')) {
            abort_unless($header && (string) $header === (string) $id, 409, 'The organization changed. Reload this page.');
        }
        $context->activate($membership->organization);
        try {
            return app(VisualRequestTrace::class)->handle($request, $next);
        } finally {
            $context->clear();
        }
    }
}
