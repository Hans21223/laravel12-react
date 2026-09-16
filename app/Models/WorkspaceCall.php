<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use App\Support\Realtime;
use Illuminate\Database\Eloquent\Model;

class WorkspaceCall extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected static function booted(): void
    {
        static::saved(fn (self $row) => Realtime::notify($row, [$row->caller_id, $row->recipient_id], 'call', $row->id));
    }

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }
}
