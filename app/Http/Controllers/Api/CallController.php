<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CallSignal;
use App\Models\User;
use App\Models\WorkspaceCall;
use App\Services\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CallController extends Controller
{
    public function configuration(Request $r)
    {
        $url = config('tenancy.turn_url');
        $secret = config('tenancy.turn_secret');
        if (! $url || ! $secret) {
            return ['available' => false, 'iceServers' => []];
        }
        $username = (time() + 3600).':'.$r->user()->id;

        return response()->json(['available' => true, 'iceServers' => [['urls' => explode(',', $url), 'username' => $username, 'credential' => base64_encode(hash_hmac('sha1', $username, $secret, true))]]])->header('Cache-Control', 'private, no-store');
    }

    private function query(Request $r)
    {
        return WorkspaceCall::where(fn ($q) => $q->where('caller_id', $r->user()->id)->orWhere('recipient_id', $r->user()->id));
    }

    private function payload(WorkspaceCall $call): array
    {
        return [...$call->toArray(), 'caller' => User::find($call->caller_id)?->only('id', 'name', 'avatar_url'), 'recipient' => User::find($call->recipient_id)?->only('id', 'name', 'avatar_url')];
    }

    public function index(Request $r)
    {
        $call = $this->query($r)->whereIn('status', ['ringing', 'accepted'])->where('expires_at', '>', now())->latest('id')->first();

        return $call ? $this->payload($call) : null;
    }

    public function create(Request $r)
    {
        abort_unless(config('tenancy.turn_url') && config('tenancy.turn_secret'), 503, 'Calls are not configured.');
        $data = $r->validate(['recipient_id' => 'required|integer', 'mode' => ['required', Rule::in(['audio', 'video'])]]);
        TeamController::peer($r, (int) $data['recipient_id']);

        $db = app(TenantContext::class)->db();
        $lock = 'ae-call-'.app(TenantContext::class)->organization->id;
        $mysql = $db->getDriverName() === 'mysql';
        if ($mysql) {
            abort_unless((int) $db->selectOne('SELECT GET_LOCK(?, 3) AS acquired', [$lock])->acquired === 1, 409, 'Try again.');
        }
        try {
            return $db->transaction(function () use ($r, $data) {
                $ids = [$r->user()->id, (int) $data['recipient_id']];
                abort_if(WorkspaceCall::whereIn('status', ['ringing', 'accepted'])->where('expires_at', '>', now())->where(fn ($q) => $q->whereIn('caller_id', $ids)->orWhereIn('recipient_id', $ids))->exists(), 409, 'One participant is already in a call.');
                $call = WorkspaceCall::create(['caller_id' => $r->user()->id, 'recipient_id' => $data['recipient_id'], 'mode' => $data['mode'], 'expires_at' => now()->addSeconds(60)]);

                return response()->json($this->payload($call), 201);
            });
        } finally {
            // Release only after the transaction commits, so another caller sees the row.
            if ($mysql) {
                $db->select('SELECT RELEASE_LOCK(?)', [$lock]);
            }
        }
    }

    public function show(Request $r, int $call)
    {
        $r->validate(['after' => 'nullable|integer|min:0']);
        $row = $this->query($r)->findOrFail($call);
        $data = $this->payload($row);
        if ($row->expires_at->isPast()) {
            $data['status'] = 'ended';
        }
        $data['signals'] = $row->expires_at->isFuture() && in_array($row->status, ['ringing', 'accepted']) ? CallSignal::where('workspace_call_id', $call)->where('sender_id', '!=', $r->user()->id)->where('id', '>', $r->integer('after'))->orderBy('id')->limit(200)->get() : [];

        return $data;
    }

    public function update(Request $r, int $call)
    {
        $data = $r->validate(['action' => ['required', Rule::in(['accept', 'decline', 'end'])]]);

        return app(TenantContext::class)->db()->transaction(function () use ($r, $call, $data) {
            $row = $this->query($r)->lockForUpdate()->findOrFail($call);
            if ($data['action'] === 'accept') {
                abort_unless($row->recipient_id === $r->user()->id && $row->status === 'ringing' && $row->expires_at->isFuture(), 409);
                $row->update(['status' => 'accepted', 'expires_at' => now()->addHour()]);
            } else {
                if ($data['action'] === 'decline') {
                    abort_unless($row->recipient_id === $r->user()->id, 403);
                }
                $row->update(['status' => $data['action'] === 'decline' ? 'declined' : 'ended', 'expires_at' => now()]);
                CallSignal::where('workspace_call_id', $call)->delete();
            }

            return $this->payload($row);
        });
    }

    public function signal(Request $r, int $call)
    {
        $data = $r->validate(['type' => ['required', Rule::in(['offer', 'answer', 'ice'])], 'payload' => 'required|array', 'payload.type' => ['nullable', Rule::in(['offer', 'answer'])], 'payload.sdp' => 'required_if:type,offer,answer|string|max:100000', 'payload.candidate' => 'required_if:type,ice|string|max:4096',
            // Browsers need the media line identifiers to apply a candidate; unvalidated keys would be dropped.
            'payload.sdpMid' => 'nullable|string|max:32', 'payload.sdpMLineIndex' => 'nullable|integer|min:0|max:64', 'payload.usernameFragment' => 'nullable|string|max:256']);
        abort_if(strlen(json_encode($data['payload'])) > 110000, 422);

        return app(TenantContext::class)->db()->transaction(function () use ($r, $call, $data) {
            $row = $this->query($r)->lockForUpdate()->findOrFail($call);
            abort_unless($row->expires_at->isFuture() && in_array($row->status, ['ringing', 'accepted']), 409);
            if ($data['type'] === 'offer') {
                abort_unless($row->caller_id === $r->user()->id, 403);
            }
            if ($data['type'] === 'answer') {
                abort_unless($row->recipient_id === $r->user()->id && $row->status === 'accepted', 403);
            }
            abort_if(CallSignal::where('workspace_call_id', $call)->count() >= 300, 429);
            CallSignal::create(['workspace_call_id' => $call, 'sender_id' => $r->user()->id, 'type' => $data['type'], 'payload' => $data['payload']]);

            return response()->noContent();
        });
    }
}
