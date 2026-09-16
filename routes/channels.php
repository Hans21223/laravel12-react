<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

// Each user listens only to their own workspace channel, and only while an active member of that organization.
Broadcast::channel('workspace.{organization}.{user}', function (User $viewer, int $organization, int $user) {
    if ($viewer->id !== $user) {
        return false;
    }
    if (! config('tenancy.enabled')) {
        return $organization === 0;
    }

    return $viewer->memberships()->where('organization_id', $organization)->where('suspended', false)
        ->whereHas('organization', fn ($q) => $q->where('status', 'ready'))->exists();
});
