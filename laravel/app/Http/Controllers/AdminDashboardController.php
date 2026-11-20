<?php

namespace App\Http\Controllers;

use App\Actions\ChangeOrderStatus;
use App\Models\ContactMessage;
use App\Models\Farm;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

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
                'delivery_fee' => (float) $order->delivery_fee,
                'courier_name' => $order->courier_name,
                'tracking_number' => $order->tracking_number,
                'estimated_delivery_at' => $order->estimated_delivery_at?->toIso8601String(),
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

        $contactMessages = ContactMessage::query()
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (ContactMessage $message): array => [
                'id' => $message->id,
                'name' => $message->name,
                'email' => $message->email,
                'phone' => $message->phone,
                'topic' => $message->topic,
                'message' => $message->message,
                'email_status' => $message->email_status,
                'reviewed_at' => $message->reviewed_at?->toIso8601String(),
                'created_at' => $message->created_at?->toIso8601String(),
            ])
            ->values();

        $salesByDay = Order::query()
            ->selectRaw('DATE(created_at) as sales_date, SUM(CASE WHEN status != ? THEN total_amount ELSE 0 END) as sales_total, COUNT(*) as order_count', ['cancelled'])
            ->where('created_at', '>=', now()->subDays(89)->startOfDay())
            ->groupByRaw('DATE(created_at)')
            ->orderBy('sales_date')
            ->get()
            ->map(fn (Order $order): array => [
                'date' => $order->sales_date,
                'revenue' => (float) $order->sales_total,
                'orders' => (int) $order->order_count,
            ])
            ->values();

        $topFarmsThisWeek = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->join('farms', 'farms.id', '=', 'products.farm_id')
            ->where('orders.status', '!=', 'cancelled')
            ->where('orders.created_at', '>=', now()->subDays(6)->startOfDay())
            ->select('farms.id', 'farms.farm_name')
            ->selectRaw('SUM(order_items.subtotal) as sales')
            ->groupBy('farms.id', 'farms.farm_name')
            ->orderByDesc('sales')
            ->limit(3)
            ->get()
            ->map(fn (object $farm): array => [
                'id' => $farm->id,
                'name' => $farm->farm_name,
                'sales' => (float) $farm->sales,
            ])
            ->values();

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
                'sales_total' => (float) Order::query()
                    ->where('status', '!=', 'cancelled')
                    ->sum('total_amount'),
                'pending_payments' => Order::query()
                    ->where('status', '!=', 'cancelled')
                    ->where('payment_status', 'pending')
                    ->count(),
                'pending_payments_total' => (float) Order::query()
                    ->where('status', '!=', 'cancelled')
                    ->where('payment_status', 'pending')
                    ->sum('total_amount'),
            ],
            'producers' => $producers,
            'customers' => $customers,
            'products' => $products,
            'orders' => $orders,
            'contactMessages' => $contactMessages,
            'salesByDay' => $salesByDay,
            'topFarmsThisWeek' => $topFarmsThisWeek,
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

    public function inviteProducer(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request->user());

        $request->merge([
            'email' => strtolower(trim((string) $request->input('email'))),
        ]);

        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $producer = User::create([
            'full_name' => trim($data['full_name']),
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password_hash' => Hash::make(Str::random(64)),
            'role' => 'producer',
            'status' => 'pending',
        ]);

        if ($message = $this->sendProducerInvitation($producer)) {
            return back()->with('warning', $message);
        }

        return back()->with('status', 'Producer invitation sent. The account will remain pending until approved.');
    }

    public function resendProducerInvitation(Request $request, User $producer): RedirectResponse
    {
        $this->authorizeAdmin($request->user());
        abort_unless($producer->role === 'producer' && $producer->status === 'pending', 404);

        if ($message = $this->sendProducerInvitation($producer)) {
            return back()->with('warning', $message);
        }

        return back()->with('status', 'Producer invitation sent.');
    }

    private function sendProducerInvitation(User $producer): ?string
    {
        try {
            $status = Password::sendResetLink(['email' => $producer->email]);
        } catch (TransportExceptionInterface $exception) {
            report($exception);

            return 'The producer account was saved, but the invitation email could not be sent. Check your SMTP settings, clear Laravel’s configuration cache, wait one minute, then use “Resend invitation” from the Farmers tab.';
        }

        if ($status !== Password::RESET_LINK_SENT) {
            return 'The producer account was saved, but Laravel could not send the invitation. Please wait before retrying or contact your administrator.';
        }

        return null;
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

    public function markContactMessageReviewed(Request $request, ContactMessage $contactMessage): RedirectResponse
    {
        $this->authorizeAdmin($request->user());
        $contactMessage->update(['reviewed_at' => now()]);

        return to_route('dashboard')->with('status', 'Contact message marked as reviewed.');
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
