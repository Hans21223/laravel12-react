<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use App\Support\Realtime;
use Illuminate\Database\Eloquent\Model;

class DirectMessage extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected static function booted(): void
    {
        static::created(fn (self $row) => Realtime::notify($row, [$row->recipient_id], 'message', $row->sender_id));
    }

    protected function casts(): array
    {
        return ['body' => 'encrypted', 'read_at' => 'datetime'];
    }
}
