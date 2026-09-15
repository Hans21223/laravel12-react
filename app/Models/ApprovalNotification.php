<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use Illuminate\Database\Eloquent\Model;

class ApprovalNotification extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }
}
