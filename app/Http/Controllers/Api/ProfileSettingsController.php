<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class ProfileSettingsController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate(['photo' => 'required|file|image|mimes:jpg,jpeg,png,webp|max:2048|dimensions:max_width=4096,max_height=4096']);
        $path = $request->file('photo')->store('avatars', 'local');
        abort_unless($path, 500);
        try {
            [$user, $previous] = DB::transaction(function () use ($request, $path) {
                $user = User::lockForUpdate()->findOrFail($request->user()->id);
                $previous = $user->avatar_path;
                $user->forceFill(['avatar_path' => $path])->save();

                return [$user, $previous];
            });
        } catch (\Throwable $error) {
            Storage::disk('local')->delete($path);
            throw $error;
        }
        if ($previous) {
            Storage::disk('local')->delete($previous);
        }

        return response()->json($user->settingsPayload());
    }

    public function remove(Request $request)
    {
        [$user, $previous] = DB::transaction(function () use ($request) {
            $user = User::lockForUpdate()->findOrFail($request->user()->id);
            $previous = $user->avatar_path;
            $user->forceFill(['avatar_path' => null])->save();

            return [$user, $previous];
        });
        if ($previous) {
            Storage::disk('local')->delete($previous);
        }

        return response()->json($user->settingsPayload());
    }

    public function show(User $user)
    {
        if (config('tenancy.enabled')) {
            abort_unless(User::inOrganization()->whereKey($user->id)->exists(), 404);
        }
        abort_unless($user->avatar_path && Storage::disk('local')->exists($user->avatar_path), 404);

        return Storage::disk('local')->response($user->avatar_path, null, [
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function password(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::min(12), 'confirmed'],
        ]);
        $request->user()->update(['password' => Hash::make($data['password'])]);

        return response()->noContent();
    }
}
