<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use App\Support\Realtime;
use Illuminate\Database\Eloquent\Model;

class ApprovalNotification extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected static function booted(): void
    {
        static::created(fn (self $row) => Realtime::notify($row, [$row->user_id], 'approvals', $row->approval_request_id));
    }

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }
}
