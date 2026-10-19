<?php

namespace App\Http\Controllers\Api;

use App\Actions\ChangeOrderStatus;
use App\Actions\PlaceOrder;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrderApiController extends Controller
{
    public function store(Request $request, PlaceOrder $placeOrder): JsonResponse
    {
        abort_unless($request->user()->role === 'customer', 403, 'Only customers can create orders');
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'decimal:0,2', 'gt:0'],
            'delivery_address' => ['required', 'string', 'max:255'],
        ]);

        $orders = $placeOrder->handle($request->user(), $data);

        return response()->json([
            'success' => true,
            'message' => 'Order created successfully',
            'orders' => $orders,
            'order' => count($orders) === 1 ? $orders[0] : null,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Order::with('items.product.farm')->latest();

        if ($user->role === 'customer') {
            $query->where('customer_id', $user->id);
        } elseif ($user->role === 'producer') {
            $query->whereHas('items.product.farm', fn ($farms) => $farms->where('producer_id', $user->id));
        } elseif (! in_array($user->role, ['admin', 'administrator'], true)) {
            abort(403, 'You are not authorized to view orders');
        }

        $orders = $query->get();

        return response()->json([
            'success' => true,
            'count' => $orders->count(),
            'orders' => $orders,
        ]);
    }

    public function mine(Request $request): JsonResponse
    {
        $orders = Order::with('items.product.farm')
            ->where('customer_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json(['success' => true, 'count' => $orders->count(), 'orders' => $orders]);
    }

    public function producerOrders(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'producer', 403, 'Only producers can access sales orders');

        $orders = Order::with('items.product.farm')
            ->whereHas('items.product.farm', fn ($farms) => $farms->where('producer_id', $request->user()->id))
            ->latest()
            ->get();

        return response()->json(['success' => true, 'count' => $orders->count(), 'orders' => $orders]);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        $user = $request->user();
        $allowed = match ($user->role) {
            'customer' => $order->customer_id === $user->id,
            'producer' => $this->producerOwnsOrder($user->id, $order),
            'admin', 'administrator' => true,
            default => false,
        };

        abort_unless($allowed, 403, 'You are not authorized to view this order');

        return response()->json(['success' => true, 'order' => $this->loadOrder($order)]);
    }

    public function updateStatus(Request $request, Order $order, ChangeOrderStatus $changeOrderStatus): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in([
                'confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled',
            ])],
        ]);
        $status = $data['status'];
        $order = $changeOrderStatus->handle($request->user(), $order, $status);

        return response()->json([
            'success' => true,
            'message' => "Order {$status} successfully",
            'order' => $order,
        ]);
    }

    private function producerOwnsOrder(int $producerId, Order $order): bool
    {
        return $order->items()
            ->whereHas('product.farm', fn ($farms) => $farms->where('producer_id', $producerId))
            ->exists();
    }

    private function loadOrder(Order $order): Order
    {
        return $order->load('items.product.farm.producer');
    }
}
