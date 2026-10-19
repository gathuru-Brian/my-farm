<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Farm;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductApiController extends Controller
{
    public function index(): JsonResponse
    {
        $products = Product::with(['farm.producer'])
            ->where('status', 'available')
            ->where('quantity_remaining', '>', 0)
            ->whereHas('farm', fn ($farms) => $farms
                ->where('status', 'active')
                ->whereHas('producer', fn ($producers) => $producers->where('status', 'active')))
            ->latest()
            ->get()
            ->map(fn (Product $product) => $this->serialize($product));

        return response()->json([
            'success' => true,
            'count' => $products->count(),
            'products' => $products,
        ]);
    }

    public function mine(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'producer', 403, 'Only producers can view their products');

        $products = Product::with(['farm.producer'])
            ->whereHas('farm', fn ($query) => $query->where('producer_id', $request->user()->id))
            ->latest()
            ->get()
            ->map(fn (Product $product) => $this->serialize($product));

        return response()->json([
            'success' => true,
            'count' => $products->count(),
            'products' => $products,
        ]);
    }

    public function inventory(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'producer', 403, 'Only producers can view inventory');

        return $this->mine($request);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'producer', 403, 'Only producers can add products');
        $data = $this->validatedProduct($request);
        $farm = Farm::whereKey($data['farm_id'])
            ->where('producer_id', $request->user()->id)
            ->firstOrFail();

        $product = $farm->products()->create([
            ...$data,
            'name' => trim($data['name']),
            'category' => trim($data['category']),
            'quantity_sold' => 0,
            'quantity_remaining' => $data['quantity_posted'],
            'status' => 'available',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Product added successfully',
            'product' => $this->serialize($product->load(['farm.producer'])),
        ], 201);
    }

    public function bulk(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'producer', 403, 'Only producers can add products');
        $data = $request->validate([
            'products' => ['required', 'array', 'min:1', 'max:1500'],
            'products.*.farm_id' => ['required', 'integer', 'exists:farms,id'],
            'products.*.name' => ['required', 'string', 'max:150'],
            'products.*.category' => ['required', 'string', 'max:100'],
            'products.*.description' => ['nullable', 'string'],
            'products.*.price' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
            'products.*.unit' => ['nullable', 'string', 'max:50'],
            'products.*.quantity_posted' => ['required', 'numeric', 'decimal:0,2', 'gt:0'],
            'products.*.image' => ['nullable', 'string', 'max:255'],
        ]);

        $created = DB::transaction(function () use ($data, $request) {
            $products = [];

            foreach ($data['products'] as $item) {
                $farm = Farm::whereKey($item['farm_id'])
                    ->where('producer_id', $request->user()->id)
                    ->firstOrFail();
                $quantity = $item['quantity_posted'];
                $products[] = $farm->products()->create([
                    ...$item,
                    'name' => trim($item['name']),
                    'category' => trim($item['category']),
                    'unit' => $item['unit'] ?? 'kg',
                    'quantity_sold' => 0,
                    'quantity_remaining' => $quantity,
                    'status' => 'available',
                ]);
            }

            return $products;
        });

        return response()->json([
            'success' => true,
            'count' => count($created),
            'products' => collect($created)
                ->map(fn (Product $product) => $this->serialize($product->load(['farm.producer']))),
        ], 201);
    }

    public function show(Product $product): JsonResponse
    {
        abort_unless(
            $product->status === 'available'
                && $product->quantity_remaining > 0
                && $product->farm?->status === 'active'
                && $product->farm?->producer?->status === 'active',
            404,
            'Product not found'
        );

        return response()->json([
            'success' => true,
            'product' => $this->serialize($product->load(['farm.producer'])),
        ]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $this->authorizeProduct($request, $product);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'category' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
            'price' => ['sometimes', 'required', 'numeric', 'decimal:0,2', 'min:0'],
            'unit' => ['sometimes', 'required', 'string', 'max:50'],
            'quantity_posted' => ['sometimes', 'required', 'numeric', 'decimal:0,2', 'min:0'],
            'image' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'required', 'string', 'in:available,inactive'],
        ]);

        $product = DB::transaction(function () use ($request, $product, $data): Product {
            $lockedProduct = Product::query()
                ->whereKey($product->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            $this->authorizeProduct($request, $lockedProduct);

            if (isset($data['quantity_posted']) && (float) $data['quantity_posted'] < (float) $lockedProduct->quantity_sold) {
                throw ValidationException::withMessages([
                    'quantity_posted' => 'Total stock cannot be lower than the quantity already sold.',
                ]);
            }

            $priorStatus = $lockedProduct->status;
            $requestedStatus = $data['status'] ?? null;
            unset($data['status']);

            $lockedProduct->fill($data);
            if (array_key_exists('quantity_posted', $data)) {
                $lockedProduct->updateInventory();
            }

            if ($requestedStatus === 'available' && $lockedProduct->quantity_remaining <= 0) {
                throw ValidationException::withMessages([
                    'status' => 'A product needs remaining stock before it can be made available.',
                ]);
            }

            if ($lockedProduct->quantity_remaining > 0) {
                $lockedProduct->status = $requestedStatus ?? ($priorStatus === 'inactive' ? 'inactive' : $lockedProduct->status);
            }

            $lockedProduct->save();

            return $lockedProduct->load(['farm.producer']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Product updated successfully',
            'product' => $this->serialize($product),
        ]);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->authorizeProduct($request, $product);

        if ($product->orderItems()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Products with order history cannot be deleted. Mark the listing inactive instead.',
            ], 409);
        }

        $product->delete();

        return response()->json(['success' => true, 'message' => 'Product deleted successfully']);
    }

    private function validatedProduct(Request $request): array
    {
        return $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'name' => ['required', 'string', 'max:150'],
            'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'decimal:0,2', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'quantity_posted' => ['required', 'numeric', 'decimal:0,2', 'gt:0'],
            'image' => ['nullable', 'string', 'max:255'],
        ]);
    }

    private function authorizeProduct(Request $request, Product $product): void
    {
        abort_unless(
            $request->user()->role === 'admin'
                || $product->farm()->where('producer_id', $request->user()->id)->exists(),
            403,
            'You are not authorized to manage this product'
        );
    }

    private function serialize(Product $product): array
    {
        $farm = $product->farm;
        $producer = $farm?->producer;

        return [
            ...$product->toArray(),
            'farm_name' => $farm?->farm_name,
            'producer' => $producer?->only(['id', 'full_name', 'email']),
        ];
    }
}
