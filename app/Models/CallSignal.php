<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use Illuminate\Database\Eloquent\Model;

class CallSignal extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['payload' => 'encrypted:array'];
    }
}
