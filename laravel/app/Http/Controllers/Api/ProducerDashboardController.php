<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProducerDashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $producer = $request->user();
        abort_unless($producer->role === 'producer', 403, 'Only producers can access this dashboard');

        $farms = Farm::query()
            ->where('producer_id', $producer->id)
            ->latest('id')
            ->get();

        $products = Product::query()
            ->with('farm:id,farm_name,producer_id')
            ->whereHas('farm', fn ($query) => $query->where('producer_id', $producer->id))
            ->latest()
            ->get();

        $orders = Order::query()
            ->with([
                'customer:id,full_name,email',
                'items.product:id,farm_id,name,unit',
                'items.product.farm:id,producer_id',
            ])
            ->whereHas('items.product.farm', fn ($query) => $query->where('producer_id', $producer->id))
            ->latest()
            ->get();

        $producerItems = fn (Order $order) => $order->items
            ->filter(fn ($item): bool => $item->product?->farm?->producer_id === $producer->id);

        return response()->json([
            'success' => true,
            'producer' => [
                'id' => $producer->id,
                'full_name' => $producer->full_name,
                'email' => $producer->email,
                'role' => $producer->role,
                'status' => $producer->status,
            ],
            'summary' => [
                'total_farms' => $farms->count(),
                'total_products' => $products->count(),
                'total_orders' => $orders->count(),
                'pending_orders' => $orders->where('status', 'pending')->count(),
                'confirmed_orders' => $orders->where('status', 'confirmed')->count(),
                'rejected_orders' => $orders->where('status', 'rejected')->count(),
                'cancelled_orders' => $orders->whereIn('status', ['cancelled', 'canceled'])->count(),
                'total_sales' => $orders->where('status', 'confirmed')->sum(
                    fn (Order $order): float => (float) $producerItems($order)->sum('subtotal')
                ),
                'total_units_sold' => $products->sum(fn (Product $product): float => (float) $product->quantity_sold),
                'total_stock_remaining' => $products->sum(fn (Product $product): float => (float) $product->quantity_remaining),
            ],
            'farms' => $farms->map(fn (Farm $farm): array => [
                'id' => $farm->id,
                'farm_name' => $farm->farm_name,
                'location' => $farm->location,
                'county' => $farm->county,
            ])->values(),
            'products' => $products->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category,
                'description' => $product->description,
                'price' => (float) $product->price,
                'unit' => $product->unit,
                'quantity_posted' => (float) $product->quantity_posted,
                'quantity_sold' => (float) $product->quantity_sold,
                'quantity_remaining' => (float) $product->quantity_remaining,
                'status' => $product->status,
                'farm_id' => $product->farm_id,
                'created_at' => $product->created_at?->toIso8601String(),
                'updated_at' => $product->updated_at?->toIso8601String(),
            ])->values(),
            'orders' => $orders->map(fn (Order $order): array => [
                'id' => $order->id,
                'customer_id' => $order->customer_id,
                'customer_name' => $order->customer?->full_name,
                'status' => $order->status,
                'total_amount' => (float) $producerItems($order)->sum('subtotal'),
                'delivery_address' => $order->delivery_address,
                'created_at' => $order->created_at?->toIso8601String(),
                'items' => $producerItems($order)->map(fn ($item): array => [
                    'product_id' => $item->product_id,
                    'name' => $item->product?->name ?? 'Product unavailable',
                    'quantity' => (float) $item->quantity,
                    'unit' => $item->product?->unit,
                    'unit_price' => (float) $item->unit_price,
                    'subtotal' => (float) $item->subtotal,
                ])->values(),
            ])->values(),
        ]);
    }
}
