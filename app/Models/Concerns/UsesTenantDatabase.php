<?php

namespace App\Models\Concerns;

use App\Services\TenantContext;

trait UsesTenantDatabase
{
    public function getConnectionName()
    {
        return app(TenantContext::class)->connectionName();
    }
}
