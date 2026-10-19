<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthApiController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->merge([
            'email' => strtolower(trim((string) $request->input('email'))),
        ]);

        $data = $request->validate([
            'full_name' => ['required_without:name', 'string', 'max:120'],
            'name' => ['required_without:full_name', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['nullable', Rule::in(['customer', 'producer'])],
        ]);

        $role = $data['role'] ?? 'customer';
        $user = User::create([
            'full_name' => trim($data['full_name'] ?? $data['name']),
            'email' => strtolower(trim($data['email'])),
            'phone' => $data['phone'] ?? null,
            'password_hash' => Hash::make($data['password']),
            'role' => $role,
            'status' => $role === 'producer' ? 'pending' : 'active',
        ]);

        $token = $user->status === 'active'
            ? $user->createToken(
                'modern-farms',
                ['*'],
                now()->addMinutes((int) config('sanctum.expiration')),
            )
            : null;

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully.',
            'access_token' => $token?->plainTextToken,
            'token_expires_at' => $token?->accessToken->expires_at?->toIso8601String(),
            'user' => $user,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', strtolower(trim($data['email'])))->first();

        if (! $user || $user->hasLegacyPasswordHash() || ! Hash::check($data['password'], $user->password_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email or password.',
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'This account is not active.',
            ], 403);
        }

        $token = $user->createToken(
            'modern-farms',
            ['*'],
            now()->addMinutes((int) config('sanctum.expiration')),
        );

        return response()->json([
            'success' => true,
            'message' => 'Login successful.',
            'access_token' => $token->plainTextToken,
            'token_expires_at' => $token->accessToken->expires_at?->toIso8601String(),
            'user' => $user,
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'user' => $request->user(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout successful.',
        ]);
    }
}
