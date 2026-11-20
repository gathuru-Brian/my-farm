<?php

namespace App\Services;

use App\Models\MpesaTransaction;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class MpesaService
{
    public function initiate(Payment $payment): array
    {
        $timestamp = now()->format('YmdHis');
        $shortcode = (string) config('services.mpesa.shortcode');
        $passkey = (string) config('services.mpesa.passkey');

        $response = $this->authenticatedPost('/mpesa/stkpush/v1/processrequest', [
            'BusinessShortCode' => $shortcode,
            'Password' => base64_encode($shortcode.$passkey.$timestamp),
            'Timestamp' => $timestamp,
            'TransactionType' => 'CustomerPayBillOnline',
            'Amount' => (int) round((float) $payment->amount),
            'PartyA' => $this->normalizePhone($payment->phone),
            'PartyB' => $shortcode,
            'PhoneNumber' => $this->normalizePhone($payment->phone),
            'CallBackURL' => (string) config('services.mpesa.callback_url'),
            'AccountReference' => 'MODERNFARMS-'.$payment->id,
            'TransactionDesc' => 'Modern Farms order payment',
        ]);

        if (($response['ResponseCode'] ?? null) !== '0') {
            throw new \RuntimeException((string) ($response['errorMessage'] ?? $response['ResponseDescription'] ?? 'M-Pesa rejected the payment request.'));
        }

        if (empty($response['CheckoutRequestID'])) {
            throw new \RuntimeException('M-Pesa accepted the request without returning a checkout request ID.');
        }

        $payment->update([
            'checkout_request_id' => $response['CheckoutRequestID'] ?? null,
            'merchant_request_id' => $response['MerchantRequestID'] ?? null,
            'status' => 'processing',
            'result_description' => $response['CustomerMessage'] ?? 'Waiting for M-Pesa confirmation',
        ]);

        $this->updateTransaction($payment, [
            'status' => 'processing',
            'result_description' => $payment->result_description,
        ]);

        return $response;
    }

    public function query(Payment $payment): array
    {
        if (! $payment->checkout_request_id) {
            throw new \RuntimeException('This payment does not have an M-Pesa checkout request.');
        }

        $timestamp = now()->format('YmdHis');
        $shortcode = (string) config('services.mpesa.shortcode');
        $passkey = (string) config('services.mpesa.passkey');

        $response = $this->authenticatedPost('/mpesa/stkpushquery/v1/query', [
            'BusinessShortCode' => $shortcode,
            'Password' => base64_encode($shortcode.$passkey.$timestamp),
            'Timestamp' => $timestamp,
            'CheckoutRequestID' => $payment->checkout_request_id,
        ]);

        $resultCode = isset($response['ResultCode']) ? (int) $response['ResultCode'] : null;

        if ($resultCode === 0) {
            $this->markPaid($payment, null);
        } elseif ($resultCode !== null) {
            DB::transaction(function () use ($payment, $resultCode, $response): void {
                $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);

                if ($lockedPayment->status === 'paid') {
                    return;
                }

                $lockedPayment->update([
                    'result_code' => $resultCode,
                    'result_description' => $response['ResultDesc'] ?? null,
                    'status' => 'failed',
                ]);
                $this->updateTransaction($lockedPayment, [
                    'status' => 'failed',
                    'result_code' => $resultCode,
                    'result_description' => $response['ResultDesc'] ?? null,
                    'completed_at' => now(),
                ]);
            });
        }

        return $response;
    }

    public function markPaid(Payment $payment, ?string $receipt): void
    {
        DB::transaction(function () use ($payment, $receipt): void {
            $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $lockedPayment->update([
                'status' => 'paid',
                'mpesa_receipt' => $receipt ?? $lockedPayment->mpesa_receipt,
                'result_code' => 0,
                'result_description' => 'Payment received',
            ]);

            Order::query()
                ->where('customer_id', $lockedPayment->customer_id)
                ->whereIn('id', $lockedPayment->order_ids ?? [])
                ->where('payment_status', '!=', 'paid')
                ->update(['payment_status' => 'paid']);

            $this->updateTransaction($lockedPayment, [
                'status' => 'paid',
                'mpesa_receipt' => $receipt,
                'result_code' => 0,
                'result_description' => 'Payment received',
                'completed_at' => now(),
            ]);
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function updateTransaction(Payment $payment, array $attributes): void
    {
        MpesaTransaction::updateOrCreate(
            ['checkout_request_id' => $payment->checkout_request_id],
            [
                'payment_id' => $payment->id,
                'merchant_request_id' => $payment->merchant_request_id,
                'amount' => $payment->amount,
                'phone' => $payment->phone,
                ...$attributes,
            ],
        );
    }

    public function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone) ?? '';

        if (str_starts_with($digits, '0')) {
            return '254'.substr($digits, 1);
        }

        if (str_starts_with($digits, '254')) {
            return $digits;
        }

        if (str_starts_with($digits, '7') || str_starts_with($digits, '1')) {
            return '254'.$digits;
        }

        return $digits;
    }

    private function accessToken(): string
    {
        $consumerKey = (string) config('services.mpesa.consumer_key');
        $consumerSecret = (string) config('services.mpesa.consumer_secret');
        $response = Http::timeout(20)
            ->withBasicAuth($consumerKey, $consumerSecret)
            ->get(rtrim((string) config('services.mpesa.base_url'), '/').'/oauth/v1/generate?grant_type=client_credentials')
            ->throw();

        return (string) $response->json('access_token');
    }

    private function authenticatedPost(string $path, array $payload): array
    {
        $response = Http::timeout(30)
            ->withToken($this->accessToken())
            ->acceptJson()
            ->post(rtrim((string) config('services.mpesa.base_url'), '/').$path, $payload);

        if (! $response->successful()) {
            throw new RequestException($response);
        }

        return (array) $response->json();
    }
}
