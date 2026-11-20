<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MpesaTransaction extends Model
{
    protected $fillable = [
        'payment_id',
        'checkout_request_id',
        'merchant_request_id',
        'mpesa_receipt',
        'amount',
        'phone',
        'status',
        'result_code',
        'result_description',
        'callback_payload',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'callback_payload' => 'array',
            'completed_at' => 'datetime',
        ];
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }
}
