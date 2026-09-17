<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view.
     */
    public function create(): Response
    {
        return Inertia::render('Approvals/Auth', [
            'mode' => 'forgot',
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // The same response for known, unknown, and throttled addresses avoids revealing which emails have accounts.
        // A mail-server failure is logged instead of turning into an error page that would reveal the account exists.
        rescue(fn () => Password::sendResetLink($request->only('email')));

        return back()->with('status', 'reset-link-sent');
    }
}
