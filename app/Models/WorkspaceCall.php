<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use Illuminate\Database\Eloquent\Model;

class WorkspaceCall extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }
}
