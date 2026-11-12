<?php

namespace App\Http\Controllers;

use App\Actions\ChangeOrderStatus;
use App\Actions\ConversationInbox;
use App\Actions\PlaceOrder;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerDashboardController extends Controller
{
    public function show(Request $request, ConversationInbox $conversationInbox): Response
    {
        abort_unless($request->user()->role === 'customer', 403);

        $products = Product::query()
            ->with(['farm.producer'])
            ->where('status', 'available')
            ->where('quantity_remaining', '>', 0)
            ->whereHas('farm', fn ($farmsQuery) => $farmsQuery
                ->where('status', 'active')
                ->whereHas('producer', fn ($producerQuery) => $producerQuery->where('status', 'active')))
            ->latest()
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'farm_id' => $product->farm_id,
                'name' => $product->name,
                'category' => $product->category,
                'description' => $product->description,
                'price' => (float) $product->price,
                'unit' => $product->unit,
                'quantity_sold' => (float) $product->quantity_sold,
                'quantity_remaining' => (float) $product->quantity_remaining,
                'image' => $product->image,
                'farm_name' => $product->farm?->farm_name,
                'farm_location' => $product->farm?->location,
                'farm_county' => $product->farm?->county,
                'producer_name' => $product->farm?->producer?->full_name,
                'created_at' => $product->created_at?->toIso8601String(),
            ])
            ->values();

        $orders = $request->user()->customerOrders()
            ->with('items.product.farm')
            ->latest()
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'total_amount' => (float) $order->total_amount,
                'delivery_address' => $order->delivery_address,
                'created_at' => $order->created_at?->toIso8601String(),
                'items' => $order->items->map(fn ($item): array => [
                    'name' => $item->product?->name ?? 'Product unavailable',
                    'farm_name' => $item->product?->farm?->farm_name,
                    'quantity' => (float) $item->quantity,
                    'unit' => $item->product?->unit,
                    'subtotal' => (float) $item->subtotal,
                ])->values(),
            ])
            ->values();

        $producers = User::query()
            ->where('role', 'producer')
            ->where('status', 'active')
            ->whereHas('farms', fn ($farmsQuery) => $farmsQuery->where('status', 'active'))
            ->orderBy('full_name')
            ->get(['id', 'full_name'])
            ->map(fn (User $producer): array => [
                'id' => $producer->id,
                'name' => $producer->full_name,
            ])
            ->values();

        return Inertia::render('Dashboards/Customer', [
            'products' => $products,
            'orders' => $orders,
            'producers' => $producers,
            'conversations' => $conversationInbox->handle($request->user()),
        ]);
    }

    public function placeOrder(Request $request, PlaceOrder $placeOrder): RedirectResponse
    {
        abort_unless($request->user()->role === 'customer', 403);

        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct', Rule::exists('products', 'id')],
            'items.*.quantity' => ['required', 'numeric', 'decimal:0,2', 'gt:0'],
            'delivery_address' => ['required', 'string', 'max:255'],
        ]);

        $placeOrder->handle($request->user(), $data);

        return to_route('dashboard')->with('status', 'Your order has been placed.');
    }

    public function cancelOrder(Request $request, Order $order, ChangeOrderStatus $changeOrderStatus): RedirectResponse
    {
        abort_unless($request->user()->role === 'customer' && $request->user()->status === 'active', 403);

        $changeOrderStatus->handle($request->user(), $order, 'cancelled');

        return to_route('dashboard')->with('status', 'Order cancelled and inventory restored.');
    }
}
