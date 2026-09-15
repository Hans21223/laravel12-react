<?php

return [
    'enabled' => env('TENANCY_ENABLED', false),
    'driver' => env('TENANT_DB_DRIVER', 'sqlite'),
    'provisioner' => env('TENANT_PROVISIONER', '/usr/local/sbin/ae-provision-tenant'),
    'max_owned_organizations' => 3,
    'max_organizations' => (int) env('MAX_ORGANIZATIONS', 100),
    'turn_url' => env('TURN_URL'),
    'turn_secret' => env('TURN_SECRET'),
];
