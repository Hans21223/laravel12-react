<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovalStep;
use App\Models\Organization;
use App\Models\OrganizationInvite;
use App\Models\OrganizationMembership;
use App\Models\User;
use App\Notifications\OrganizationInvitation;
use App\Services\OrganizationService;
use App\Services\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class OrganizationController extends Controller
{
    public function index(Request $r)
    {
        $joined = $r->user()->memberships()->with('organization')->get()->map(fn ($m) => [...$m->organization->publicPayload(), 'role' => $m->role, 'suspended' => $m->suspended]);
        // Setups that failed before the owner's membership existed stay visible so they can be retried or removed.
        $failed = Organization::where('owner_user_id', $r->user()->id)->where('status', 'failed')->whereNotIn('id', $joined->pluck('id'))->get()
            ->map(fn ($org) => [...$org->publicPayload(), 'role' => 'manager', 'suspended' => false]);

        return $joined->concat($failed)->values();
    }

    public function retry(Request $r, OrganizationService $service, int $organization)
    {
        $org = Organization::where('owner_user_id', $r->user()->id)->where('status', 'failed')->findOrFail($organization);
        $org->update(['status' => 'provisioning']);
        $org = $service->finish($org, $r->user());
        $r->session()->put('organization_id', $org->id);
        $r->session()->regenerate();

        return $org->publicPayload();
    }

    public function discard(Request $r, int $organization)
    {
        $org = Organization::where('owner_user_id', $r->user()->id)->where('status', 'failed')->findOrFail($organization);
        // A database that was already created is kept for an administrator; only never-provisioned records are removed.
        abort_if($org->database_credentials !== null, 409, 'This setup created a database. Ask the service administrator to remove it.');
        $org->delete();

        return response()->noContent();
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

    private function owner(Request $r): Organization
    {
        $org = app(TenantContext::class)->organization ?? abort(404);
        abort_unless($org->owner_user_id === $r->user()->id, 403, 'Only the organization owner can do this.');

        return $org;
    }

    private function assertNoPendingAssignments(int $userId): void
    {
        $assigned = ApprovalStep::where('reviewer_id', $userId)->whereIn('status', ['pending', 'waiting'])->whereHas('request', fn ($q) => $q->where('status', 'pending'))->exists();
        abort_if($assigned, 409, 'Resolve or reassign this member\'s pending approval stages first.');
    }

    private function leaveActive(Request $r, Organization $org, array $userIds): void
    {
        User::whereIn('id', $userIds)->where('active_organization_id', $org->id)->update(['active_organization_id' => null]);
        if (in_array($r->user()->id, $userIds, true)) {
            $r->session()->forget('organization_id');
            $r->session()->regenerate();
        }
    }

    public function rename(Request $r)
    {
        $org = $this->owner($r);
        $org->update($r->validate(['name' => 'required|string|min:3|max:100']));

        return $org->publicPayload();
    }

    public function transfer(Request $r)
    {
        $org = $this->owner($r);
        $data = $r->validate(['membership' => 'required|integer']);

        return DB::transaction(function () use ($r, $org, $data) {
            $target = OrganizationMembership::where('organization_id', $org->id)->where('role', 'manager')->where('suspended', false)->lockForUpdate()->findOrFail($data['membership']);
            abort_if($target->user_id === $r->user()->id, 422, 'Choose another manager.');
            Organization::whereKey($org->id)->where('owner_user_id', $r->user()->id)->update(['owner_user_id' => $target->user_id]) === 1 || abort(409);

            return $org->fresh()->publicPayload();
        });
    }

    public function leave(Request $r)
    {
        $org = app(TenantContext::class)->organization ?? abort(404);
        abort_if($org->owner_user_id === $r->user()->id, 409, 'Transfer ownership or close the organization before leaving.');

        return DB::transaction(function () use ($r, $org) {
            $membership = OrganizationMembership::where('organization_id', $org->id)->where('user_id', $r->user()->id)->lockForUpdate()->firstOrFail();
            $this->assertNoPendingAssignments($r->user()->id);
            $membership->delete();
            $this->leaveActive($r, $org, [$r->user()->id]);

            return response()->noContent();
        });
    }

    public function close(Request $r)
    {
        $org = $this->owner($r);
        abort_if($org->is_legacy, 409, 'The original Anaheim Electronics workspace cannot be closed.');
        $r->validate(['confirm_name' => ['required', 'string', Rule::in([$org->name])]]);
        $org->update(['status' => 'closed']);
        // The database is retained so an administrator can restore it; every member simply loses access.
        $this->leaveActive($r, $org, OrganizationMembership::where('organization_id', $org->id)->pluck('user_id')->all());

        return response()->noContent();
    }

    public function invites(Request $r)
    {
        $org = $this->manager($r);

        return OrganizationInvite::where('organization_id', $org->id)->latest('id')->limit(50)->get();
    }

    public function invite(Request $r)
    {
        $org = $this->manager($r);
        $data = $r->validate(['label' => 'required|string|max:100', 'email' => 'nullable|email|max:255', 'max_uses' => 'required|integer|min:1|max:20', 'days' => 'required|integer|min:1|max:14', 'send_email' => 'boolean']);
        $key = 'AE-'.Str::random(40);
        $invite = OrganizationInvite::create(['organization_id' => $org->id, 'created_by' => $r->user()->id, 'key_hash' => hash('sha256', $key), 'label' => $data['label'], 'email' => $data['email'] ?? null, 'max_uses' => $data['max_uses'], 'expires_at' => now()->addDays($data['days'])]);

        $emailed = false;
        if (($data['send_email'] ?? false) && $invite->email) {
            // A delivery failure never loses the key: it is still returned once for manual sharing.
            try {
                Notification::route('mail', $invite->email)->notify(new OrganizationInvitation($org->name, $r->user()->name, $key, $invite->expires_at->toFormattedDateString()));
                $emailed = true;
            } catch (\Throwable $error) {
                report($error);
            }
        }

        return response()->json(['invitation' => $invite, 'key' => $key, 'emailed' => $emailed], 201)->header('Cache-Control', 'no-store');
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
        $data = $r->validate(['search' => 'nullable|string|max:100', 'role' => 'nullable|in:manager,employee']);

        return OrganizationMembership::where('organization_id', $org->id)->with('user:id,name,email,avatar_path')
            ->when($r->user()->role !== 'manager', fn ($q) => $q->where('suspended', false))
            ->when($data['search'] ?? null, fn ($q, $search) => $q->whereHas('user', fn ($u) => $u->where('name', 'like', '%'.$search.'%')))
            ->when($data['role'] ?? null, fn ($q, $role) => $q->where('role', $role))
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
            if ($data['suspended'] || $data['role'] !== 'manager') {
                $this->assertNoPendingAssignments($member->user_id);
            }
            $member->update($data);

            return $member;
        });
    }
}
