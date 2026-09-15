<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DirectMessage;
use App\Models\OrganizationMembership;
use App\Models\User;
use App\Services\TenantContext;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    public static function peer(Request $r, int $id, bool $write = true): User
    {
        abort_if($id === $r->user()->id, 422, 'Choose another employee.');
        $org = app(TenantContext::class)->organization ?? abort(404);
        OrganizationMembership::where('organization_id', $org->id)->where('user_id', $id)->when($write, fn ($q) => $q->where('suspended', false))->firstOrFail();

        return User::findOrFail($id);
    }

    public function conversations(Request $r)
    {
        $id = $r->user()->id;
        $groups = app(TenantContext::class)->db()->table('direct_messages')->where(fn ($q) => $q->where('sender_id', $id)->orWhere('recipient_id', $id))
            ->selectRaw('CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS peer_id, MAX(id) AS latest_id, SUM(CASE WHEN recipient_id = ? AND read_at IS NULL THEN 1 ELSE 0 END) AS unread', [$id, $id])
            ->groupBy('peer_id')->orderByDesc('latest_id')->limit(100)->get();
        $messages = DirectMessage::whereIn('id', $groups->pluck('latest_id'))->get()->keyBy('id');
        $peers = User::whereIn('id', $groups->pluck('peer_id'))->get(['id', 'name', 'avatar_path'])->keyBy('id');

        return $groups->map(fn ($g) => ['peer' => $peers->get($g->peer_id), 'latest' => $messages->get($g->latest_id), 'unread' => (int) $g->unread]);
    }

    public function messages(Request $r, int $peer)
    {
        self::peer($r, $peer, false);
        $r->validate(['after' => 'nullable|integer|min:0', 'before' => 'nullable|integer|min:1']);
        $id = $r->user()->id;
        $q = DirectMessage::where(fn ($q) => $q->where('sender_id', $id)->where('recipient_id', $peer))->orWhere(fn ($q) => $q->where('sender_id', $peer)->where('recipient_id', $id));
        $q = DirectMessage::whereIn('id', $q->select('id'));
        if ($r->filled('after')) {
            return $q->where('id', '>', $r->integer('after'))->orderBy('id')->limit(100)->get();
        }

        return $q->when($r->filled('before'), fn ($q) => $q->where('id', '<', $r->integer('before')))->orderByDesc('id')->limit(50)->get()->reverse()->values();
    }

    public function send(Request $r, int $peer)
    {
        self::peer($r, $peer);
        $data = $r->validate(['body' => 'required|string|min:1|max:4000']);
        abort_unless(trim($data['body']) !== '', 422);

        return response()->json(DirectMessage::create(['sender_id' => $r->user()->id, 'recipient_id' => $peer, 'body' => trim($data['body'])]), 201);
    }

    public function read(Request $r, int $peer)
    {
        self::peer($r, $peer, false);
        $r->validate(['through' => 'required|integer|min:1']);
        DirectMessage::where('sender_id', $peer)->where('recipient_id', $r->user()->id)->where('id', '<=', $r->integer('through'))->whereNull('read_at')->update(['read_at' => now()]);

        return response()->noContent();
    }
}
