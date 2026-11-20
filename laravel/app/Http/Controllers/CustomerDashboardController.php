<?php

namespace App\Http\Controllers;

use App\Actions\ChangeOrderStatus;
use App\Actions\ConversationInbox;
use App\Actions\PlaceOrder;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Services\MpesaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                'delivery_fee' => (float) $order->delivery_fee,
                'courier_name' => $order->courier_name,
                'tracking_number' => $order->tracking_number,
                'estimated_delivery_at' => $order->estimated_delivery_at?->toIso8601String(),
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

        $payments = Payment::query()
            ->where('customer_id', $request->user()->id)
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (Payment $payment): array => [
                'id' => $payment->id,
                'order_ids' => $payment->order_ids ?? [],
                'amount' => (float) $payment->amount,
                'phone' => $payment->phone,
                'status' => $payment->status,
                'mpesa_receipt' => $payment->mpesa_receipt,
                'result_description' => $payment->result_description,
                'updated_at' => $payment->updated_at?->toIso8601String(),
            ])
            ->values();

        return Inertia::render('Dashboards/Customer', [
            'products' => $products,
            'orders' => $orders,
            'producers' => $producers,
            'conversations' => $conversationInbox->handle($request->user()),
            'payments' => $payments,
        ]);
    }

    public function placeOrder(Request $request, PlaceOrder $placeOrder): RedirectResponse
    {
        abort_unless($request->user()->role === 'customer', 403);
        $request->merge([
            'payment_method' => $request->input('payment_method', 'pay_on_delivery'),
        ]);

        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'distinct', Rule::exists('products', 'id')],
            'items.*.quantity' => ['required', 'numeric', 'decimal:0,2', 'gt:0'],
            'delivery_address' => ['required', 'string', 'max:255'],
            'payment_method' => ['required', Rule::in(['mpesa', 'pay_on_delivery'])],
            'mpesa_phone' => ['nullable', 'required_if:payment_method,mpesa', 'string', 'max:30', 'regex:/^(?:(?:\\+?254)|0)?[17]\\d{8}$/'],
        ]);

        $orders = $placeOrder->handle($request->user(), $data);

        if ($data['payment_method'] === 'mpesa') {
            $payment = Payment::create([
                'customer_id' => $request->user()->id,
                'order_id' => count($orders) === 1 ? $orders[0]->id : null,
                'order_ids' => collect($orders)->pluck('id')->all(),
                'provider' => 'mpesa',
                'amount' => collect($orders)->sum('total_amount'),
                'phone' => trim($data['mpesa_phone']),
                'status' => 'pending',
            ]);

            try {
                app(MpesaService::class)->initiate($payment);
            } catch (\Throwable $exception) {
                $payment->update([
                    'status' => 'failed',
                    'result_description' => 'M-Pesa initiation failed.',
                ]);
                report($exception);

                return back()->withErrors([
                    'payment_phone' => 'M-Pesa is temporarily unavailable. You can retry the payment or choose pay on delivery.',
                ]);
            }

            return to_route('dashboard')->with(
                'status',
                'Check your phone and enter your M-Pesa PIN to complete the payment.',
            );
        }

        foreach ($orders as $order) {
            $order->update(['payment_status' => 'pay_on_delivery']);
        }

        return to_route('dashboard')->with('status', 'Your order has been placed with pay-on-delivery payment.');
    }

    public function mpesaCallback(Request $request, MpesaService $mpesaService): JsonResponse
    {
        $payload = (array) $request->json()->all();
        $callback = (array) ($payload['Body']['stkCallback'] ?? []);
        $checkoutRequestId = (string) ($callback['CheckoutRequestID'] ?? '');
        if ($checkoutRequestId === '') {
            return response()->json(['success' => false, 'message' => 'Invalid callback'], 400);
        }

        $payment = Payment::where('checkout_request_id', $checkoutRequestId)->first();
        if (! $payment) {
            return response()->json(['success' => false, 'message' => 'Payment not found'], 404);
        }

        $merchantRequestId = (string) ($callback['MerchantRequestID'] ?? '');
        if ($payment->merchant_request_id !== null && $payment->merchant_request_id !== $merchantRequestId) {
            return response()->json(['success' => false, 'message' => 'Callback does not match the payment'], 400);
        }

        $resultCode = (int) ($callback['ResultCode'] ?? -1);
        $resultDescription = (string) ($callback['ResultDesc'] ?? 'M-Pesa callback received');
        $receipt = null;

        if ($resultCode === 0) {
            $metadata = collect((array) data_get($callback, 'CallbackMetadata.Item', []))
                ->filter(fn ($item): bool => is_array($item))
                ->mapWithKeys(fn (array $item): array => [(string) ($item['Name'] ?? '') => $item['Value'] ?? null]);
            $amount = $metadata->get('Amount');
            $phone = $metadata->get('PhoneNumber');
            $receipt = trim((string) $metadata->get('MpesaReceiptNumber', ''));

            if (
                ! is_numeric($amount)
                || (int) $amount !== (int) round((float) $payment->amount)
                || ! is_numeric($phone)
                || $mpesaService->normalizePhone((string) $phone) !== $mpesaService->normalizePhone($payment->phone)
                || $receipt === ''
            ) {
                return response()->json(['success' => false, 'message' => 'Callback details do not match the payment'], 400);
            }

            try {
                $mpesaService->query($payment);
            } catch (\Exception $exception) {
                report($exception);

                return response()->json(['success' => false, 'message' => 'Payment confirmation is temporarily unavailable'], 503);
            }

            $payment->refresh();
            if ($payment->status !== 'paid') {
                return response()->json(['success' => false, 'message' => 'M-Pesa has not confirmed this payment'], 503);
            }

            $mpesaService->markPaid($payment, $receipt);
        }

        DB::transaction(function () use ($payment, $resultCode, $resultDescription, $payload, $mpesaService): void {
            $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);

            if ($resultCode === 0 && $lockedPayment->status === 'paid') {
                $lockedPayment->update(['callback_payload' => $payload]);
                $mpesaService->updateTransaction($lockedPayment, [
                    'status' => 'paid',
                    'mpesa_receipt' => $lockedPayment->mpesa_receipt,
                    'result_code' => $resultCode,
                    'result_description' => $resultDescription,
                    'callback_payload' => $payload,
                    'completed_at' => now(),
                ]);
            } elseif ($lockedPayment->status !== 'paid') {
                $lockedPayment->update([
                    'status' => 'failed',
                    'result_code' => $resultCode,
                    'result_description' => $resultDescription,
                    'callback_payload' => $payload,
                ]);
                $mpesaService->updateTransaction($lockedPayment, [
                    'status' => 'failed',
                    'result_code' => $resultCode,
                    'result_description' => $resultDescription,
                    'callback_payload' => $payload,
                    'completed_at' => now(),
                ]);
            }
        });

        return response()->json(['success' => true]);
    }

    public function queryMpesaPayment(Request $request, Payment $payment, MpesaService $mpesaService): JsonResponse
    {
        abort_unless($request->user()->role === 'customer' && $payment->customer_id === $request->user()->id, 403);

        try {
            $response = $mpesaService->query($payment);
        } catch (\Exception $exception) {
            report($exception);

            return response()->json([
                'success' => false,
                'message' => 'Payment status could not be checked. Please try again.',
            ], 503);
        }

        $payment->refresh();

        return response()->json([
            'success' => true,
            'status' => $payment->status,
            'response' => $response,
        ]);
    }

    public function retryMpesaPayment(Request $request, Payment $payment, MpesaService $mpesaService): RedirectResponse
    {
        abort_unless($request->user()->role === 'customer' && $payment->customer_id === $request->user()->id, 403);
        abort_unless($payment->status === 'failed', 409);

        $data = $request->validate([
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^(?:(?:\\+?254)|0)?[17]\\d{8}$/'],
        ]);
        $orderIds = $payment->order_ids ?? ($payment->order_id ? [$payment->order_id] : []);
        $orders = Order::query()
            ->where('customer_id', $request->user()->id)
            ->whereIn('id', $orderIds)
            ->where('status', '!=', 'cancelled')
            ->where('payment_status', '!=', 'paid')
            ->get();

        if ($orderIds === [] || $orders->count() !== count(array_unique($orderIds))) {
            return back()->withErrors([
                'payment_phone' => 'This order can no longer be paid. Refresh your orders and contact support if needed.',
            ]);
        }

        $retryPayment = Payment::create([
            'customer_id' => $request->user()->id,
            'order_id' => count($orderIds) === 1 ? $orderIds[0] : null,
            'order_ids' => array_values(array_unique($orderIds)),
            'provider' => 'mpesa',
            'amount' => $payment->amount,
            'phone' => trim($data['phone'] ?? $payment->phone),
            'status' => 'pending',
        ]);

        try {
            $mpesaService->initiate($retryPayment);
        } catch (\Exception $exception) {
            $retryPayment->update([
                'status' => 'failed',
                'result_description' => 'M-Pesa initiation failed.',
            ]);
            report($exception);

            return back()->withErrors([
                'payment_phone' => 'M-Pesa is temporarily unavailable. Please try again or choose pay on delivery with a new order.',
            ]);
        }

        return back()->with('status', 'Check your phone and enter your M-Pesa PIN to complete the payment.');
    }

    public function cancelOrder(Request $request, Order $order, ChangeOrderStatus $changeOrderStatus): RedirectResponse
    {
        abort_unless($request->user()->role === 'customer' && $request->user()->status === 'active', 403);

        $changeOrderStatus->handle($request->user(), $order, 'cancelled');

        return to_route('dashboard')->with('status', 'Order cancelled and inventory restored.');
    }
}
