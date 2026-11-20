<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    protected $fillable = [
        'customer_id',
        'order_id',
        'order_ids',
        'provider',
        'amount',
        'phone',
        'status',
        'checkout_request_id',
        'merchant_request_id',
        'mpesa_receipt',
        'result_code',
        'result_description',
        'callback_payload',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'order_ids' => 'array',
            'callback_payload' => 'array',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function mpesaTransactions(): HasMany
    {
        return $this->hasMany(MpesaTransaction::class);
    }
}
