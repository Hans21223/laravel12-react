<?php

use App\Models\Organization;
use App\Services\DatabaseTransfer;
use App\Services\OrganizationService;
use App\Services\TenantContext;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

// Run only during maintenance, with credentials in a root-private file.
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->isDownForMaintenance()) {
    throw new RuntimeException('Maintenance mode is required.');
}
$source = DB::connection();
if ($source->getDriverName() !== 'sqlite') {
    throw new RuntimeException('Source must be SQLite.');
}
$credentials = json_decode(file_get_contents($argv[1]), true, flags: JSON_THROW_ON_ERROR);
config(['database.connections.migration_target' => [...config('database.connections.mysql'), ...$credentials, 'url' => null]]);
if (Artisan::call('migrate', ['--database' => 'migration_target', '--force' => true]) !== 0) {
    throw new RuntimeException('Central schema migration failed.');
}
$target = DB::connection('migration_target');
$tables = array_values(array_diff($source->getSchemaBuilder()->getTableListing(schemaQualified: false), ['migrations', 'sqlite_sequence']));
$transfer = new DatabaseTransfer;
$counts = $transfer->copy($source, $target, $tables);
config(['database.default' => 'migration_target', 'tenancy.enabled' => true, 'tenancy.driver' => 'mysql']);
$legacy = Organization::where('is_legacy', true)->sole();
app(OrganizationService::class)->provision($legacy);
$tenantCounts = $transfer->copy($target, DB::connection('tenant'), DatabaseTransfer::WORKSPACE_TABLES);
app(TenantContext::class)->clear();
// Emit only counts. Passwords, hashes, messages and connection credentials stay private.
file_put_contents(getenv('AE_BACKUP_DIR').'/mysql-copy-verification.json', json_encode(['central' => $counts, 'legacy_workspace' => $tenantCounts], JSON_PRETTY_PRINT));
echo "MYSQL_COPY_VERIFIED\n";
