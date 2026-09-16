<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\ApprovalRequest;
use App\Models\Organization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        if (config('tenancy.enabled')) {
            // Owners must transfer or close their organizations and members must leave active ones first.
            if (Organization::where('owner_user_id', $user->id)->whereNotIn('status', ['closed', 'failed'])->exists()) {
                throw ValidationException::withMessages(['account' => 'owner']);
            }
            if ($user->memberships()->whereHas('organization', fn ($q) => $q->where('status', '!=', 'closed'))->exists()) {
                throw ValidationException::withMessages(['account' => 'member']);
            }
        } elseif (ApprovalRequest::withTrashed()->where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['account' => 'records']);
        }

        Auth::logout();

        DB::transaction(function () use ($user) {
            $user->memberships()->delete();
            Organization::where('owner_user_id', $user->id)->whereNull('database_credentials')->where('status', 'failed')->delete();
            Organization::where('owner_user_id', $user->id)->update(['owner_user_id' => null]);
            $user->delete();
        });

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
