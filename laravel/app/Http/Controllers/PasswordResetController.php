<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function sendLink(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        Password::sendResetLink([
            'email' => strtolower(trim($data['email'])),
        ]);

        return back()->with(
            'status',
            'If an account exists for that email, a password reset link has been sent.',
        );
    }

    public function edit(Request $request, string $token): Response
    {
        return Inertia::render('Auth/ResetPassword', [
            'email' => (string) $request->query('email', ''),
            'token' => $token,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $credentials,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password_hash' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
                $user->tokens()->delete();

                event(new PasswordReset($user));
            },
        );

        if ($status === Password::PASSWORD_RESET) {
            return to_route('login')->with(
                'status',
                'Your password has been reset. Sign in using your new password.',
            );
        }

        return back()->withErrors([
            'email' => __($status),
        ]);
    }
}
