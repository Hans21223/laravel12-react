<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use Illuminate\Database\Eloquent\Model;

class DirectMessage extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['body' => 'encrypted', 'read_at' => 'datetime'];
    }
}
