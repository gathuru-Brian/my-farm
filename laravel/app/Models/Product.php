<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'farm_id',
        'name',
        'category',
        'description',
        'price',
        'unit',
        'quantity_posted',
        'quantity_sold',
        'quantity_remaining',
        'image',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'quantity_posted' => 'decimal:2',
            'quantity_sold' => 'decimal:2',
            'quantity_remaining' => 'decimal:2',
        ];
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function updateInventory(): void
    {
        $this->quantity_remaining = max(
            (float) $this->quantity_posted - (float) $this->quantity_sold,
            0
        );
        $this->status = $this->quantity_remaining <= 0 ? 'sold_out' : 'available';
    }
}
