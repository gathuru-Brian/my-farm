<?php

namespace App\Http\Controllers;

use App\Actions\ChangeOrderStatus;
use App\Actions\ConversationInbox;
use App\Actions\CreateProductsFromBulk;
use App\Models\Farm;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProducerDashboardController extends Controller
{
    public function show(Request $request, ConversationInbox $conversationInbox): Response
    {
        $producer = $request->user();
        abort_unless($producer->role === 'producer', 403);

        $farms = $producer->farms()->withCount('products')->latest()->get()->map(fn (Farm $farm): array => [
            'id' => $farm->id,
            'farm_name' => $farm->farm_name,
            'description' => $farm->description,
            'location' => $farm->location,
            'county' => $farm->county,
            'farm_size' => $farm->farm_size,
            'farm_size_unit' => $farm->farm_size_unit,
            'phone' => $farm->phone,
            'email' => $farm->email,
            'status' => $farm->status,
            'products_count' => $farm->products_count,
        ])->values();

        if ($producer->status !== 'active') {
            return Inertia::render('Dashboards/Producer', [
                'farms' => [],
                'products' => [],
                'orders' => [],
                'conversations' => [],
                'stats' => ['products' => 0, 'inventory' => 0, 'orders' => 0, 'pending_orders' => 0],
            ]);
        }

        $products = Product::query()
            ->with('farm')
            ->whereHas('farm', fn ($farmsQuery) => $farmsQuery->where('producer_id', $producer->id))
            ->latest()
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'farm_id' => $product->farm_id,
                'farm_name' => $product->farm?->farm_name,
                'name' => $product->name,
                'category' => $product->category,
                'description' => $product->description,
                'price' => (float) $product->price,
                'unit' => $product->unit,
                'quantity_posted' => (float) $product->quantity_posted,
                'quantity_sold' => (float) $product->quantity_sold,
                'quantity_remaining' => (float) $product->quantity_remaining,
                'status' => $product->status,
                'created_at' => $product->created_at?->toIso8601String(),
            ])
            ->values();

        $ordersQuery = fn () => Order::query()
            ->whereHas('items.product.farm', fn ($farmsQuery) => $farmsQuery->where('producer_id', $producer->id));

        $totalOrders = $ordersQuery()->count();
        $pendingOrders = $ordersQuery()->where('status', 'pending')->count();
        $orders = $ordersQuery()
            ->with(['customer:id,full_name,email', 'items.product.farm'])
            ->latest()
            ->get();

        $visibleOrders = $orders->take(100)->values();

        $customerOrders = $orders->reject(fn (Order $order): bool => in_array($order->status, ['cancelled', 'canceled', 'rejected'], true));
        $customers = $customerOrders
            ->groupBy('customer_id')
            ->map(function ($ordersForCustomer) use ($producer): array {
                $customer = $ordersForCustomer->first()->customer;
                $producerItemsTotal = fn (Order $order): float => (float) $order->items
                    ->filter(fn ($item): bool => $item->product?->farm?->producer_id === $producer->id)
                    ->sum(fn ($item): float => (float) $item->subtotal);

                return [
                    'id' => $customer?->id,
                    'name' => $customer?->full_name ?? 'Customer',
                    'email' => $customer?->email,
                    'orders' => $ordersForCustomer->count(),
                    'total_value' => $ordersForCustomer->sum($producerItemsTotal),
                ];
            })
            ->sortByDesc('total_value')
            ->values();

        $monthlyOrders = $customerOrders->filter(fn (Order $order): bool => $order->created_at?->isSameMonth(now()) ?? false);
        $activeProducts = $products->filter(fn (array $product): bool => ! in_array($product['status'], ['inactive', 'disabled', 'deleted'], true));
        $inventoryValue = $activeProducts->sum(fn (array $product): float => $product['price'] * $product['quantity_remaining']);
        $revenueFromItems = fn (Order $order): float => (float) $order->items
            ->filter(fn ($item): bool => $item->product?->farm?->producer_id === $producer->id)
            ->sum(fn ($item): float => (float) $item->subtotal);

        $producerOrders = $visibleOrders->map(function (Order $order) use ($producer): array {
            $items = $order->items->filter(fn ($item): bool => $item->product?->farm?->producer_id === $producer->id);

            return [
                'id' => $order->id,
                'status' => $order->status,
                'total_amount' => (float) $items->sum(fn ($item): float => (float) $item->subtotal),
                'delivery_address' => $order->delivery_address,
                'customer_name' => $order->customer?->full_name,
                'created_at' => $order->created_at?->toIso8601String(),
                'items' => $items->map(fn ($item): array => [
                    'name' => $item->product?->name ?? 'Product unavailable',
                    'quantity' => (float) $item->quantity,
                    'unit' => $item->product?->unit,
                    'subtotal' => (float) $item->subtotal,
                ])->values(),
            ];
        })->values();

        return Inertia::render('Dashboards/Producer', [
            'farms' => $farms,
            'products' => $products,
            'orders' => $producerOrders,
            'customers' => $customers,
            'conversations' => $conversationInbox->handle($producer),
            'stats' => [
                'products' => $products->count(),
                'inventory' => $products->sum('quantity_remaining'),
                'orders' => $totalOrders,
                'pending_orders' => $pendingOrders,
                'inventory_value' => $inventoryValue,
                'units_sold' => $activeProducts->sum('quantity_sold'),
                'active_products' => $activeProducts->count(),
                'revenue' => $customerOrders->sum($revenueFromItems),
                'unique_customers' => $customers->count(),
                'sold_value' => $activeProducts->sum(fn (array $product): float => $product['price'] * $product['quantity_sold']),
                'month_products' => $products->filter(fn (array $product): bool => isset($product['created_at']) && Carbon::parse($product['created_at'])->isSameMonth(now()))->count(),
                'month_orders' => $monthlyOrders->count(),
                'month_revenue' => $monthlyOrders->sum($revenueFromItems),
            ],
        ]);
    }

    public function storeFarm(Request $request): RedirectResponse
    {
        $producer = $this->activeProducer($request->user());
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

        $producer->farms()->create([
            ...$data,
            'farm_name' => trim($data['farm_name']),
            'status' => 'active',
        ]);

        return to_route('dashboard')->with('status', 'Farm added successfully.');
    }

    public function updateFarm(Request $request, Farm $farm): RedirectResponse
    {
        $producer = $this->activeProducer($request->user());
        abort_unless($farm->producer_id === $producer->id, 404);

        $data = $request->validate([
            'farm_name' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:200'],
            'county' => ['nullable', 'string', 'max:100'],
            'farm_size' => ['nullable', 'numeric', 'min:0'],
            'farm_size_unit' => ['nullable', 'string', 'max:30'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $farm->update([
            ...$data,
            'farm_name' => trim($data['farm_name']),
        ]);

        return to_route('dashboard')->with('status', 'Farm profile updated.');
    }

    public function storeProduct(Request $request): RedirectResponse
    {
        $producer = $this->activeProducer($request->user());
        $data = $request->validate([
            'farm_id' => ['required', 'integer', Rule::exists('farms', 'id')],
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'quantity_posted' => ['required', 'numeric', 'decimal:0,2', 'gt:0'],
        ]);
        $farm = $producer->farms()->whereKey($data['farm_id'])->firstOrFail();

        $farm->products()->create([
            ...$data,
            'name' => trim($data['name']),
            'category' => trim($data['category']),
            'unit' => $data['unit'] ?: 'kg',
            'quantity_sold' => 0,
            'quantity_remaining' => $data['quantity_posted'],
            'status' => 'available',
        ]);

        return to_route('dashboard')->with('status', 'Product added to your inventory.');
    }

    public function storeProductsInBulk(Request $request, CreateProductsFromBulk $createProductsFromBulk): RedirectResponse
    {
        $producer = $this->activeProducer($request->user());
        $data = $request->validate([
            'products' => ['required', 'array', 'min:1', 'max:1500'],
            'products.*' => ['required', 'array:farm_id,name,category,description,price,unit,quantity_posted,image'],
            'products.*.farm_id' => ['required', 'integer', Rule::exists('farms', 'id')],
            'products.*.name' => ['required', 'string', 'max:150'],
            'products.*.category' => ['required', 'string', 'max:100'],
            'products.*.description' => ['nullable', 'string'],
            'products.*.price' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
            'products.*.unit' => ['nullable', 'string', 'max:50'],
            'products.*.quantity_posted' => ['required', 'numeric', 'decimal:0,2', 'gt:0'],
            'products.*.image' => ['nullable', 'string', 'max:255'],
        ]);

        $created = $createProductsFromBulk->handle($producer, $data['products']);

        return to_route('dashboard')->with('status', $created->count().' products added to your inventory.');
    }

    public function updateProduct(Request $request, Product $product): RedirectResponse
    {
        $producer = $this->activeProducer($request->user());
        $data = $request->validate([
            'price' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
            'quantity_posted' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
            'status' => ['required', Rule::in(['available', 'inactive'])],
        ]);

        DB::transaction(function () use ($producer, $product, $data): void {
            $lockedProduct = Product::query()
                ->whereKey($product->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            abort_unless($lockedProduct->farm()->where('producer_id', $producer->id)->exists(), 404);

            if ((float) $data['quantity_posted'] < (float) $lockedProduct->quantity_sold) {
                throw ValidationException::withMessages([
                    'quantity_posted' => 'Total stock cannot be lower than the quantity already sold.',
                ]);
            }

            $lockedProduct->price = $data['price'];
            $lockedProduct->quantity_posted = $data['quantity_posted'];
            $lockedProduct->updateInventory();

            if ($data['status'] === 'available' && $lockedProduct->quantity_remaining <= 0) {
                throw ValidationException::withMessages([
                    'status' => 'A product needs remaining stock before it can be made available.',
                ]);
            }

            if ($data['status'] === 'inactive' && $lockedProduct->quantity_remaining > 0) {
                $lockedProduct->status = 'inactive';
            }

            $lockedProduct->save();
        });

        return to_route('dashboard')->with('status', 'Product updated.');
    }

    public function updateOrderStatus(Request $request, Order $order, ChangeOrderStatus $changeOrderStatus): RedirectResponse
    {
        $producer = $this->activeProducer($request->user());
        $data = $request->validate([
            'status' => ['required', Rule::in(['confirmed', 'processing', 'ready', 'shipped', 'delivered', 'cancelled'])],
        ]);

        $changeOrderStatus->handle($producer, $order, $data['status']);

        return to_route('dashboard')->with('status', 'Order status updated.');
    }

    private function activeProducer(User $producer): User
    {
        abort_unless($producer->role === 'producer' && $producer->status === 'active', 403);

        return $producer;
    }
}
