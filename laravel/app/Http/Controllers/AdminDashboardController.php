<?php

namespace App\Http\Controllers;

use App\Actions\ChangeOrderStatus;
use App\Models\Farm;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function show(Request $request): Response
    {
        $this->authorizeAdmin($request->user());

        $producers = User::query()
            ->where('role', 'producer')
            ->with(['farms' => fn ($farmsQuery) => $farmsQuery->withCount('products')])
            ->latest('id')
            ->get()
            ->map(fn (User $producer): array => [
                'id' => $producer->id,
                'name' => $producer->full_name ?: $producer->email,
                'email' => $producer->email,
                'phone' => $producer->phone,
                'status' => $producer->status,
                'created_at' => $producer->created_at?->toIso8601String(),
                'farms' => $producer->farms->map(fn (Farm $farm): array => [
                    'id' => $farm->id,
                    'name' => $farm->farm_name,
                    'status' => $farm->status,
                    'products_count' => $farm->products_count,
                ])->values(),
                'product_count' => $producer->farms->sum('products_count'),
            ])
            ->values();

        $customers = User::query()
            ->where('role', 'customer')
            ->withCount(['customerOrders as order_count' => fn ($ordersQuery) => $ordersQuery->where('status', '!=', 'cancelled')])
            ->withSum(['customerOrders as total_spent' => fn ($ordersQuery) => $ordersQuery->where('status', '!=', 'cancelled')], 'total_amount')
            ->latest('id')
            ->get()
            ->map(fn (User $customer): array => [
                'id' => $customer->id,
                'name' => $customer->full_name ?: $customer->email,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'order_count' => $customer->order_count,
                'total_spent' => (float) ($customer->total_spent ?? 0),
                'created_at' => $customer->created_at?->toIso8601String(),
            ])
            ->values();

        $products = Product::query()
            ->with(['farm:id,farm_name,producer_id', 'farm.producer:id,full_name'])
            ->latest('id')
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'price' => (float) $product->price,
                'unit' => $product->unit,
                'quantity_remaining' => (float) $product->quantity_remaining,
                'status' => $product->status,
                'farm_name' => $product->farm?->farm_name,
                'producer_name' => $product->farm?->producer?->full_name,
            ])
            ->values();

        $orders = Order::query()
            ->with(['customer:id,full_name,email', 'items.product.farm'])
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'total_amount' => (float) $order->total_amount,
                'delivery_address' => $order->delivery_address,
                'customer_name' => $order->customer?->full_name,
                'customer_email' => $order->customer?->email,
                'created_at' => $order->created_at?->toIso8601String(),
                'items' => $order->items->map(fn ($item): array => [
                    'name' => $item->product?->name ?? 'Product unavailable',
                    'farm_name' => $item->product?->farm?->farm_name,
                    'quantity' => (float) $item->quantity,
                    'unit' => $item->product?->unit,
                    'subtotal' => (float) $item->subtotal,
                ])->values(),
            ])->values();

        return Inertia::render('Dashboards/Admin', [
            'stats' => [
                'producers_total' => $producers->count(),
                'producers_pending' => $producers->where('status', 'pending')->count(),
                'producers_approved' => $producers->where('status', 'active')->count(),
                'customers' => $customers->count(),
                'products' => $products->count(),
                'products_available' => Product::query()
                    ->where('status', 'available')
                    ->whereHas('farm', fn ($farmsQuery) => $farmsQuery
                        ->where('status', 'active')
                        ->whereHas('producer', fn ($producersQuery) => $producersQuery->where('status', 'active')))
                    ->count(),
                'orders' => Order::count(),
            ],
            'producers' => $producers,
            'customers' => $customers,
            'products' => $products,
            'orders' => $orders,
        ]);
    }

    public function updateProducerStatus(Request $request, User $producer): RedirectResponse
    {
        $this->authorizeAdmin($request->user());
        abort_unless($producer->role === 'producer', 404);
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected', 'suspended'])],
        ]);

        $producer->status = $data['status'] === 'approved' ? 'active' : $data['status'];
        $producer->save();

        return to_route('dashboard')->with('status', 'Producer status updated.');
    }

    public function updateProductStatus(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeAdmin($request->user());
        $data = $request->validate([
            'status' => ['required', Rule::in(['available', 'inactive'])],
        ]);

        if ($data['status'] === 'available' && $product->quantity_remaining <= 0) {
            return back()->withErrors([
                'status' => 'A product needs remaining stock before it can be restored.',
            ]);
        }

        $product->status = $data['status'];
        $product->save();

        return to_route('dashboard')->with('status', 'Product status updated.');
    }

    public function updateOrderStatus(Request $request, Order $order, ChangeOrderStatus $changeOrderStatus): RedirectResponse
    {
        $this->authorizeAdmin($request->user());
        $data = $request->validate([
            'status' => ['required', Rule::in([
                'confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled',
            ])],
        ]);

        $changeOrderStatus->handle($request->user(), $order, $data['status']);

        return to_route('dashboard')->with('status', 'Order status updated.');
    }

    private function authorizeAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'administrator'], true), 403);
    }
}
