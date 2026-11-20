<?php

namespace App\Actions;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlaceOrder
{
    /**
     * @param  array{items: array<int, array{product_id: int, quantity: int|float|string}>, delivery_address: string}  $data
     * @return array<int, Order>
     */
    public function handle(User $customer, array $data): array
    {
        return DB::transaction(function () use ($customer, $data): array {
            $lineItems = [];

            foreach ($data['items'] as $item) {
                $product = Product::whereKey($item['product_id'])->lockForUpdate()->firstOrFail();
                $quantity = (float) $item['quantity'];
                $remaining = (float) $product->quantity_remaining;

                if ($product->status !== 'available') {
                    throw ValidationException::withMessages([
                        'items' => "{$product->name} is not available.",
                    ]);
                }

                if ($product->farm?->status !== 'active' || $product->farm?->producer?->status !== 'active') {
                    throw ValidationException::withMessages([
                        'items' => "{$product->name} is no longer available from an active farm.",
                    ]);
                }

                if ($quantity > $remaining) {
                    throw ValidationException::withMessages([
                        'items' => "Insufficient stock for {$product->name}. Available: {$remaining} {$product->unit}.",
                    ]);
                }

                $price = (float) $product->price;
                $subtotal = round($price * $quantity, 2);
                $lineItems[] = compact('product', 'quantity', 'price', 'subtotal');
            }

            $orders = [];

            foreach (collect($lineItems)->groupBy(fn (array $line): int => $line['product']->farm_id) as $farmId => $farmItems) {
                $order = Order::create([
                    'customer_id' => $customer->id,
                    'farm_id' => $farmId,
                    'total_amount' => $farmItems->sum('subtotal'),
                    'delivery_address' => trim($data['delivery_address']),
                    'status' => 'pending',
                    'payment_status' => 'pending',
                    'payment_method' => $data['payment_method'] ?? 'pay_on_delivery',
                ]);

                foreach ($farmItems as $line) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $line['product']->id,
                        'quantity' => $line['quantity'],
                        'unit_price' => $line['price'],
                        'subtotal' => $line['subtotal'],
                    ]);

                    $product = $line['product'];
                    $product->quantity_sold = (float) $product->quantity_sold + $line['quantity'];
                    $product->quantity_remaining = max(0, (float) $product->quantity_remaining - $line['quantity']);

                    if ($product->quantity_remaining <= 0) {
                        $product->status = 'sold_out';
                    }

                    $product->save();
                }

                $orders[] = $order->load('items.product.farm.producer');
            }

            return $orders;
        });
    }
}
