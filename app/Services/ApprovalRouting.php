<?php

namespace App\Services;

use App\Models\ApprovalNotification;
use App\Models\ApprovalRequest;
use App\Models\User;
use Illuminate\Http\Request;

class ApprovalRouting
{
    // Called inside the request transaction. Prior rounds stay available for audit.
    public function configure(ApprovalRequest $item, Request $request): void
    {
        $old = $item->steps()->where('round', $item->approval_round)->get();
        // Only use supplied IDs when the corresponding route passed validation.
        $ids = $request->input('route_mode') === 'sequential' ? $request->input('reviewer_ids') : $old->pluck('reviewer_id')->all();
        if ($old->isNotEmpty()) {
            if ($old->every(fn ($step) => $step->status === 'waiting')) {
                // An unsubmitted draft has no review decisions to retain.
                $item->steps()->where('round', $item->approval_round)->delete();
            } else {
                $item->steps()->where('round', $item->approval_round)->whereIn('status', ['pending', 'waiting'])->update(['status' => 'superseded']);
                $item->increment('approval_round');
            }
        }
        if ($item->route_mode !== 'sequential') {
            return;
        }
        foreach ($ids as $index => $id) {
            $item->steps()->create([
                'reviewer_id' => $id, 'round' => $item->approval_round, 'position' => $index + 1,
                'status' => $item->status === 'pending' && $index === 0 ? 'pending' : 'waiting',
            ]);
        }
    }

    public function notifyReviewers(ApprovalRequest $item): void
    {
        $ids = $item->route_mode === 'sequential'
            ? $item->steps()->where('round', $item->approval_round)->where('status', 'pending')->pluck('reviewer_id')
            : User::where('role', 'manager')->where('id', '!=', $item->user_id)->pluck('id');
        foreach ($ids as $id) {
            ApprovalNotification::create(['user_id' => $id, 'approval_request_id' => $item->id, 'action' => 'submitted', 'title' => $item->title]);
        }
    }

    public function stop(ApprovalRequest $item): void
    {
        $item->steps()->where('round', $item->approval_round)->whereIn('status', ['pending', 'waiting'])->update(['status' => 'skipped']);
    }
}
