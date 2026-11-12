<?php

namespace App\Actions;

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CreateProductsFromBulk
{
    /**
     * @param  array<int, array{farm_id: int|string, name: string, category: string, description?: ?string, price: int|float|string, unit?: ?string, quantity_posted: int|float|string, image?: ?string}>  $items
     * @return Collection<int, Product>
     */
    public function handle(User $producer, array $items): Collection
    {
        return DB::transaction(function () use ($producer, $items): Collection {
            return collect($items)->map(function (array $item) use ($producer): Product {
                $farm = $producer->farms()->whereKey($item['farm_id'])->firstOrFail();
                $quantity = $item['quantity_posted'];

                return $farm->products()->create([
                    ...$item,
                    'name' => trim($item['name']),
                    'category' => trim($item['category']),
                    'unit' => $item['unit'] ?? 'kg',
                    'quantity_sold' => 0,
                    'quantity_remaining' => $quantity,
                    'status' => 'available',
                ]);
            });
        });
    }
}
