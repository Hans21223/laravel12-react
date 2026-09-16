<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use App\Support\Realtime;
use Illuminate\Database\Eloquent\Model;

class CallSignal extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected static function booted(): void
    {
        static::created(function (self $row) {
            $call = WorkspaceCall::find($row->workspace_call_id);
            if ($call) {
                Realtime::notify($row, [$row->sender_id === $call->caller_id ? $call->recipient_id : $call->caller_id], 'call', $call->id);
            }
        });
    }

    protected function casts(): array
    {
        return ['payload' => 'encrypted:array'];
    }
}
