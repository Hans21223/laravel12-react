<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\DatabaseTransfer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MySqlTransferTest extends TestCase
{
    use RefreshDatabase;

    public function test_real_mysql_transfer_preserves_ids_passwords_unicode_and_soft_deletes(): void
    {
        if (! getenv('AE_TEST_MYSQL')) {
            $this->markTestSkipped('Real MySQL is exercised by the CI MySQL service.');
        }
        $source = DB::connection();
        $user = User::factory()->create(['name' => 'ทดสอบ 日本語', 'preferences' => ['theme' => 'dark', 'page_size' => 8]]);
        $source->table('approval_requests')->insert(['id' => 22, 'user_id' => $user->id, 'title' => 'CRUD verification ไทย 日本語', 'description' => 'Preserve this row', 'type' => 'budget', 'amount' => '31415.90', 'department' => 'Operations', 'version' => 3, 'deleted_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $database = 'ae_org_'.bin2hex(random_bytes(16));
        $pdo = new \PDO('mysql:host=127.0.0.1;port=3306', 'root', getenv('MYSQL_TEST_PASSWORD'));
        $pdo->exec("CREATE DATABASE `$database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        config(['database.connections.transfer_test' => [...config('database.connections.mysql'), 'host' => '127.0.0.1', 'port' => '3306', 'database' => $database, 'username' => 'root', 'password' => getenv('MYSQL_TEST_PASSWORD'), 'url' => null]]);
        try {
            $this->assertSame(0, Artisan::call('migrate', ['--database' => 'transfer_test', '--force' => true]));
            $target = DB::connection('transfer_test');
            $tables = array_values(array_diff($source->getSchemaBuilder()->getTableListing(schemaQualified: false), ['migrations', 'sqlite_sequence']));
            $counts = (new DatabaseTransfer)->copy($source, $target, $tables);
            $this->assertSame(1, $counts['users']);
            $this->assertSame($user->password, $target->table('users')->where('id', $user->id)->value('password'));
            $this->assertSame('ทดสอบ 日本語', $target->table('users')->where('id', $user->id)->value('name'));
            $this->assertSame('31415.90', $target->table('approval_requests')->where('id', 22)->value('amount'));
            $this->assertNotNull($target->table('approval_requests')->where('id', 22)->value('deleted_at'));
        } finally {
            DB::purge('transfer_test');
            $pdo->exec("DROP DATABASE `$database`");
        }
    }
}
