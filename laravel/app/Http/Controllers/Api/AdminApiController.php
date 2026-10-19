<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminApiController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json([
            'success' => true,
            'stats' => [
                'producers_total' => User::where('role', 'producer')->count(),
                'producers_pending' => User::where('role', 'producer')->where('status', 'pending')->count(),
                'producers_approved' => User::where('role', 'producer')->where('status', 'active')->count(),
                'customers' => User::where('role', 'customer')->count(),
                'products' => Product::count(),
                'products_available' => Product::query()
                    ->where('status', 'available')
                    ->where('quantity_remaining', '>', 0)
                    ->whereHas('farm', fn ($farms) => $farms
                        ->where('status', 'active')
                        ->whereHas('producer', fn ($producers) => $producers->where('status', 'active')))
                    ->count(),
                'orders' => Order::count(),
            ],
        ]);
    }

    public function producers(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $statuses = [
            'pending' => 'pending',
            'approved' => 'active',
            'rejected' => 'rejected',
            'suspended' => 'suspended',
        ];
        $status = $request->query('status');
        $query = User::where('role', 'producer')->with(['farms.products']);
        if (isset($statuses[$status])) {
            $query->where('status', $statuses[$status]);
        }

        $producers = $query->latest('id')->get()->map(function (User $producer) use ($statuses) {
            $farm = $producer->farms->first();

            return [
                'id' => $producer->id,
                'name' => $producer->full_name ?: $producer->email,
                'email' => $producer->email,
                'phone' => $producer->phone,
                'approval_status' => array_search($producer->status, $statuses, true) ?: $producer->status,
                'farm_name' => $farm?->farm_name,
                'product_count' => $producer->farms->sum(fn (Farm $item) => $item->products->count()),
                'created_at' => $producer->created_at?->toISOString(),
            ];
        });

        return response()->json(['success' => true, 'producers' => $producers]);
    }

    public function approveProducer(Request $request, User $producer): JsonResponse
    {
        $this->authorizeAdmin($request);
        abort_unless($producer->role === 'producer', 404, 'Producer not found');
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected', 'suspended'])],
        ]);
        $producer->status = match ($data['status']) {
            'approved' => 'active',
            default => $data['status'],
        };
        $producer->save();

        return response()->json([
            'success' => true,
            'message' => "Producer marked as {$data['status']}",
        ]);
    }

    public function customers(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $customers = User::where('role', 'customer')
            ->withCount(['customerOrders as order_count' => fn ($orders) => $orders->where('status', '!=', 'cancelled')])
            ->withSum(['customerOrders as total_spent' => fn ($orders) => $orders->where('status', '!=', 'cancelled')], 'total_amount')
            ->latest('id')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->full_name ?: $user->email,
                'email' => $user->email,
                'phone' => $user->phone,
                'order_count' => $user->order_count,
                'total_spent' => (float) ($user->total_spent ?? 0),
                'created_at' => $user->created_at?->toISOString(),
            ]);

        return response()->json(['success' => true, 'customers' => $customers]);
    }

    public function products(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);
        $products = Product::with('farm.producer')->latest('id')->get()->map(fn (Product $product) => [
            'id' => $product->id,
            'name' => $product->name,
            'category' => $product->category,
            'price' => (float) $product->price,
            'unit' => $product->unit,
            'quantity_remaining' => (float) $product->quantity_remaining,
            'quantity_sold' => (float) $product->quantity_sold,
            'status' => $product->status,
            'farm_name' => $product->farm?->farm_name,
            'producer_name' => $product->farm?->producer?->full_name,
        ]);

        return response()->json(['success' => true, 'products' => $products]);
    }

    public function setProductStatus(Request $request, Product $product): JsonResponse
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'status' => ['required', Rule::in(['available', 'inactive'])],
        ]);

        if ($data['status'] === 'available' && $product->quantity_remaining <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'A product needs remaining stock before it can be restored.',
            ], 422);
        }

        $product->status = $data['status'];
        $product->save();

        return response()->json([
            'success' => true,
            'message' => 'Product status updated successfully',
        ]);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless(in_array($request->user()->role, ['admin', 'administrator'], true), 403, 'Admin access required');
    }
}
