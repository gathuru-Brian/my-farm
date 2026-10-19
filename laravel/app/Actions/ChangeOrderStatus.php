<?php

namespace App\Actions;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ChangeOrderStatus
{
    public function handle(User $user, Order $order, string $status): Order
    {
        return DB::transaction(function () use ($user, $order, $status): Order {
            $lockedOrder = Order::query()
                ->whereKey($order->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($user->role === 'customer') {
                abort_unless(
                    $lockedOrder->customer_id === $user->id && $status === 'cancelled',
                    403,
                    'Customers can only cancel their own orders'
                );
            } elseif ($user->role === 'producer') {
                abort_unless(
                    $this->producerOwnsEntireOrder($user->id, $lockedOrder),
                    403,
                    'You are not authorized to update this order'
                );
            } elseif (! in_array($user->role, ['admin', 'administrator'], true)) {
                abort(403, 'You are not authorized to update orders');
            }

            abort_if(
                in_array($lockedOrder->status, ['delivered', 'cancelled', 'rejected'], true),
                422,
                "A {$lockedOrder->status} order cannot be modified"
            );

            $transitions = [
                'pending' => ['confirmed', 'cancelled'],
                'confirmed' => ['processing', 'cancelled'],
                'processing' => ['ready', 'cancelled'],
                'ready' => ['shipped', 'cancelled'],
                'shipped' => ['delivered'],
            ];

            abort_unless(
                in_array($status, $transitions[$lockedOrder->status] ?? [], true),
                422,
                "A {$lockedOrder->status} order cannot move to {$status}"
            );

            if ($status === 'cancelled') {
                foreach ($lockedOrder->items()->orderBy('product_id')->get() as $item) {
                    $product = Product::whereKey($item->product_id)->lockForUpdate()->first();

                    if (! $product) {
                        continue;
                    }

                    $product->quantity_remaining = (float) $product->quantity_remaining + (float) $item->quantity;
                    $product->quantity_sold = max(0, (float) $product->quantity_sold - (float) $item->quantity);

                    if ($product->quantity_remaining > 0 && $product->status === 'sold_out') {
                        $product->status = 'available';
                    }

                    $product->save();
                }
            }

            $lockedOrder->status = $status;
            $lockedOrder->save();

            return $lockedOrder->load('items.product.farm.producer');
        });
    }

    private function producerOwnsOrder(int $producerId, Order $order): bool
    {
        return $order->items()
            ->whereHas('product.farm', fn ($farms) => $farms->where('producer_id', $producerId))
            ->exists();
    }

    private function producerOwnsEntireOrder(int $producerId, Order $order): bool
    {
        return $this->producerOwnsOrder($producerId, $order)
            && ! $order->items()
                ->whereDoesntHave('product.farm', fn ($farms) => $farms->where('producer_id', $producerId))
                ->exists();
    }
}
