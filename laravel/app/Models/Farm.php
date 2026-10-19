<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Farm extends Model
{
    protected $fillable = [
        'producer_id',
        'farm_name',
        'description',
        'location',
        'county',
        'farm_size',
        'farm_size_unit',
        'phone',
        'email',
        'status',
    ];

    protected function casts(): array
    {
        return ['farm_size' => 'decimal:2'];
    }

    public function producer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'producer_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
