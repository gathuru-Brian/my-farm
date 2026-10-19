<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FarmApiController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $farms = Farm::where('producer_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'count' => $farms->count(),
            'farms' => $farms,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->role === 'producer', 403, 'Only producers can create farms');

        $data = $request->validate([
            'farm_name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:200'],
            'county' => ['nullable', 'string', 'max:100'],
            'farm_size' => ['nullable', 'numeric', 'min:0'],
            'farm_size_unit' => ['nullable', 'string', 'max:30'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
        ]);

        $farm = Farm::create([
            ...$data,
            'producer_id' => $user->id,
            'farm_name' => trim($data['farm_name']),
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Farm created successfully',
            'farm' => $farm,
        ], 201);
    }

    public function show(Request $request, Farm $farm): JsonResponse
    {
        $this->authorizeFarm($request, $farm);

        return response()->json(['success' => true, 'farm' => $farm]);
    }

    public function update(Request $request, Farm $farm): JsonResponse
    {
        $this->authorizeFarm($request, $farm);

        $data = $request->validate([
            'farm_name' => ['sometimes', 'required', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string'],
            'location' => ['sometimes', 'nullable', 'string', 'max:200'],
            'county' => ['sometimes', 'nullable', 'string', 'max:100'],
            'farm_size' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'farm_size_unit' => ['sometimes', 'nullable', 'string', 'max:30'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'status' => ['sometimes', 'required', 'string', 'in:active,inactive'],
        ]);

        $farm->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Farm updated successfully',
            'farm' => $farm->refresh(),
        ]);
    }

    public function destroy(Request $request, Farm $farm): JsonResponse
    {
        $this->authorizeFarm($request, $farm);

        $hasOrderHistory = $farm->products()
            ->whereHas('orderItems')
            ->exists();

        if ($hasOrderHistory) {
            return response()->json([
                'success' => false,
                'message' => 'Farms with products in order history cannot be deleted.',
            ], 409);
        }

        $farm->delete();

        return response()->json([
            'success' => true,
            'message' => 'Farm deleted successfully',
        ]);
    }

    private function authorizeFarm(Request $request, Farm $farm): void
    {
        abort_unless(
            $request->user()->role === 'admin'
                || $farm->producer_id === $request->user()->id,
            403,
            'You are not authorized to access this farm'
        );
    }
}
