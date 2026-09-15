<?php

use App\Models\Organization;
use App\Services\TenantContext;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;

require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! config('tenancy.enabled')) {
    exit(0);
}
$context = app(TenantContext::class);
foreach (Organization::where('status', 'ready')->get() as $org) {
    if (! $org->database_credentials) {
        throw new RuntimeException('Ready organization has no dedicated database.');
    }
    try {
        $context->activate($org);
        if (Artisan::call('migrate', ['--database' => 'tenant', '--path' => 'database/migrations/tenant', '--force' => true]) !== 0) {
            throw new RuntimeException('Tenant migration failed.');
        }
        // Signaling has no historical value; remove expired call payloads during deployment.
        $db = $context->db();
        $db->table('call_signals')->whereIn('workspace_call_id', $db->table('workspace_calls')->select('id')->where('expires_at', '<', now()))->delete();
    } finally {
        $context->clear();
    }
}
echo "ORGANIZATION_SCHEMAS_READY\n";
