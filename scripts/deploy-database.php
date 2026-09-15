<?php

use App\Models\Organization;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

// Invoked over SSH from the verified project directory. No credentials are logged.
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$db = DB::connection();
$path = $db->getDatabaseName();
$operation = $argv[1] ?? '';

if ($operation === 'backup') {
    $directory = getenv('AE_BACKUP_DIR');
    if (! $directory || ! is_dir($directory)) {
        throw new RuntimeException('Backup directory is missing.');
    }
    if ($db->getDriverName() === 'sqlite') {
        $destination = $directory.'/database.sqlite';
        $pdo = $db->getPdo();
        $pdo->exec('VACUUM INTO '.$pdo->quote($destination));
        chmod($destination, 0600);
        file_put_contents($directory.'/database-path.txt', $path.PHP_EOL);
        echo 'SQLITE_BACKUP_OK'.PHP_EOL;
    } elseif ($db->getDriverName() === 'mysql') {
        $names = [$db->getDatabaseName()];
        foreach (Organization::whereNotNull('database_credentials')->get() as $org) {
            $names[] = $org->database_credentials['database'];
        }
        foreach (array_unique($names) as $name) {
            if (! preg_match('/^ae_org_[a-f0-9]{32}$/', $name)) {
                throw new RuntimeException('Unexpected backup database.');
            }
            $file = $directory.'/'.$name.'.sql';
            $process = proc_open(['/usr/bin/mysqldump', '--user=root', '--single-transaction', '--skip-lock-tables', '--no-tablespaces', '--routines', '--triggers', '--events', '--databases', $name], [0 => ['pipe', 'r'], 1 => ['file', $file, 'w'], 2 => ['pipe', 'w']], $pipes);
            if (! is_resource($process)) {
                throw new RuntimeException('Backup could not start.');
            }
            fclose($pipes[0]);
            stream_get_contents($pipes[2]);
            fclose($pipes[2]);
            if (proc_close($process) !== 0 || filesize($file) < 100) {
                throw new RuntimeException('MySQL backup failed.');
            }
            chmod($file, 0600);
        }
        file_put_contents($directory.'/mysql-databases.json', json_encode($names));
        echo 'MYSQL_ALL_DATABASES_BACKED_UP'.PHP_EOL;
    } else {
        throw new RuntimeException('Unsupported database driver.');
    }
} elseif ($operation === 'provision') {
    $user = User::where('email', 'karn@accord.test')->first();
    if (! $user) {
        $hash = getenv('INITIAL_MANAGER_HASH');
        if (! $hash || (password_get_info($hash)['algoName'] ?? 'unknown') === 'unknown') {
            throw new RuntimeException('Initial manager password hash is required.');
        }
        $user = new User;
        $user->forceFill(['name' => 'Karn Chaiwiseskul', 'email' => 'karn@accord.test',
            'password' => $hash, 'department' => 'Operations', 'locale' => 'en']);
        echo 'MANAGER_CREATED_WITH_NEW_PASSWORD'.PHP_EOL;
    } else {
        echo 'MANAGER_EXISTING_PASSWORD_PRESERVED'.PHP_EOL;
    }
    $user->forceFill(['role' => 'manager'])->save();
    echo 'MANAGER_READY'.PHP_EOL;
} elseif ($operation === 'permissions') {
    if ($db->getDriverName() === 'mysql') {
        echo 'MYSQL_CREDENTIALS_REMAIN_PRIVATE'.PHP_EOL;
        exit(0);
    }
    if (! is_file($path)) {
        throw new RuntimeException('SQLite database file not found.');
    }
    foreach ([dirname($path), $path] as $target) {
        if (! chown($target, 'www-data') || ! chgrp($target, 'www-data')) {
            throw new RuntimeException('Unable to set database ownership.');
        }
    }
    chmod(dirname($path), 0775);
    chmod($path, 0664);
} else {
    throw new RuntimeException('Unknown operation.');
}
