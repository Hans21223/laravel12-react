<?php

namespace App\Support;

use App\Events\WorkspaceChanged;
use App\Services\TenantContext;
use Illuminate\Database\Eloquent\Model;

class Realtime
{
    // Notify users after the surrounding transaction commits. Polling remains the fallback, so a socket outage never fails a request.
    public static function notify(Model $model, iterable $userIds, string $kind, ?int $reference = null): void
    {
        if (! in_array(config('broadcasting.default'), ['reverb', 'pusher'], true)) {
            return;
        }
        $organization = app(TenantContext::class)->organization?->id ?? 0;
        $ids = collect($userIds)->filter()->map(fn ($id) => (int) $id)->unique()->values();
        $model->getConnection()->afterCommit(function () use ($organization, $ids, $kind, $reference) {
            foreach ($ids as $id) {
                // event() broadcasts synchronously here; broadcast() would defer to a destructor outside this try block.
                try {
                    event(new WorkspaceChanged($organization, $id, $kind, $reference));
                } catch (\Throwable) {
                    return;
                }
            }
        });
    }
}
