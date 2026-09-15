<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationInvite;
use App\Models\OrganizationMembership;
use App\Services\OrganizationService;
use App\Services\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OrganizationController extends Controller
{
    public function index(Request $r)
    {
        return $r->user()->memberships()->with('organization')->get()->map(fn ($m) => [...$m->organization->publicPayload(), 'role' => $m->role, 'suspended' => $m->suspended]);
    }

    public function create(Request $r, OrganizationService $service)
    {
        $data = $r->validate(['name' => 'required|string|min:3|max:100']);
        $org = $service->create($r->user(), $data['name']);
        $r->session()->put('organization_id', $org->id);
        $r->session()->regenerate();

        return response()->json($org->publicPayload(), 201);
    }

    public function join(Request $r, OrganizationService $service)
    {
        $data = $r->validate(['invitation_key' => 'required|string|max:200']);
        $org = $service->join($r->user(), $data['invitation_key']);
        $r->session()->put('organization_id', $org->id);
        $r->session()->regenerate();

        return $org->publicPayload();
    }

    public function switch(Request $r, int $organization)
    {
        $membership = $r->user()->memberships()->where('organization_id', $organization)->where('suspended', false)->whereHas('organization', fn ($q) => $q->where('status', 'ready'))->firstOrFail();
        $r->session()->put('organization_id', $membership->organization_id);
        $r->session()->regenerate();
        $r->user()->forceFill(['active_organization_id' => $organization])->save();

        return response()->noContent();
    }

    private function manager(Request $r): Organization
    {
        abort_unless($r->user()->role === 'manager', 403);

        return app(TenantContext::class)->organization ?? abort(404);
    }

    public function invites(Request $r)
    {
        $org = $this->manager($r);

        return OrganizationInvite::where('organization_id', $org->id)->latest('id')->limit(50)->get();
    }

    public function invite(Request $r)
    {
        $org = $this->manager($r);
        $data = $r->validate(['label' => 'required|string|max:100', 'email' => 'nullable|email|max:255', 'max_uses' => 'required|integer|min:1|max:20', 'days' => 'required|integer|min:1|max:14']);
        $key = 'AE-'.Str::random(40);
        $invite = OrganizationInvite::create(['organization_id' => $org->id, 'created_by' => $r->user()->id, 'key_hash' => hash('sha256', $key), 'label' => $data['label'], 'email' => $data['email'] ?? null, 'max_uses' => $data['max_uses'], 'expires_at' => now()->addDays($data['days'])]);

        return response()->json(['invitation' => $invite, 'key' => $key], 201)->header('Cache-Control', 'no-store');
    }

    public function revoke(Request $r, int $invite)
    {
        $org = $this->manager($r);
        OrganizationInvite::where('organization_id', $org->id)->findOrFail($invite)->update(['revoked_at' => now()]);

        return response()->noContent();
    }

    public function members(Request $r)
    {
        $org = app(TenantContext::class)->organization ?? abort(404);
        $data = $r->validate(['search' => 'nullable|string|max:100']);

        return OrganizationMembership::where('organization_id', $org->id)->with('user:id,name,email,avatar_path')
            ->when($r->user()->role !== 'manager', fn ($q) => $q->where('suspended', false))
            ->when($data['search'] ?? null, fn ($q, $search) => $q->whereHas('user', fn ($u) => $u->where('name', 'like', '%'.$search.'%')))
            ->orderBy('id')->paginate(24);
    }

    public function updateMember(Request $r, int $membership)
    {
        $org = $this->manager($r);
        abort_unless($org->owner_user_id === $r->user()->id, 403, 'Only the organization owner can change membership access.');
        $data = $r->validate(['role' => ['required', Rule::in(['manager', 'employee'])], 'suspended' => 'required|boolean']);

        return DB::transaction(function () use ($org, $membership, $data) {
            $member = OrganizationMembership::where('organization_id', $org->id)->lockForUpdate()->findOrFail($membership);
            abort_if($member->user_id === $org->owner_user_id, 409, 'The owner must retain access.');
            $member->update($data);

            return $member;
        });
    }
}
