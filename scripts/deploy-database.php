<?php

// Invoked over SSH from the verified project directory. No credentials are logged.
require getcwd().'/vendor/autoload.php';
$app = require getcwd().'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$db = Illuminate\Support\Facades\DB::connection();
if ($db->getDriverName() !== 'sqlite') {
    throw new RuntimeException('This deployment backup procedure requires SQLite.');
}
$path = $db->getDatabaseName();
$operation = $argv[1] ?? '';

if ($operation === 'backup') {
    $directory = getenv('AE_BACKUP_DIR');
    if (! $directory || ! is_dir($directory)) {
        throw new RuntimeException('Backup directory is missing.');
    }
    $destination = $directory.'/database.sqlite';
    $pdo = $db->getPdo();
    $pdo->exec('VACUUM INTO '.$pdo->quote($destination));
    chmod($destination, 0600);
    file_put_contents($directory.'/database-path.txt', $path.PHP_EOL);
    echo 'SQLITE_BACKUP_OK'.PHP_EOL;
} elseif ($operation === 'provision') {
    $user = App\Models\User::where('email', 'karn@accord.test')->first();
    if (! $user) {
        $hash = getenv('INITIAL_MANAGER_HASH');
        if (! $hash || (password_get_info($hash)['algoName'] ?? 'unknown') === 'unknown') {
            throw new RuntimeException('Initial manager password hash is required.');
        }
        $user = new App\Models\User;
        $user->forceFill(['name' => 'Karn Chaiwiseskul', 'email' => 'karn@accord.test',
            'password' => $hash, 'department' => 'Operations', 'locale' => 'en']);
        echo 'MANAGER_CREATED_WITH_NEW_PASSWORD'.PHP_EOL;
    } else {
        echo 'MANAGER_EXISTING_PASSWORD_PRESERVED'.PHP_EOL;
    }
    $user->forceFill(['role' => 'manager'])->save();
    echo 'MANAGER_READY'.PHP_EOL;
} elseif ($operation === 'permissions') {
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
