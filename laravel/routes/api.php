<?php

use App\Http\Controllers\Api\AdminApiController;
use App\Http\Controllers\Api\AuthApiController;
use App\Http\Controllers\Api\FarmApiController;
use App\Http\Controllers\Api\MessageApiController;
use App\Http\Controllers\Api\OrderApiController;
use App\Http\Controllers\Api\ProducerDashboardController;
use App\Http\Controllers\Api\ProductApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware(['auth:sanctum', 'account.active']);

Route::get('/health', function () {
    try {
        DB::connection()->getPdo();

        foreach ([
            'users', 'farms', 'products', 'orders', 'order_items', 'conversations', 'direct_messages',
            'personal_access_tokens', 'password_reset_tokens', 'sessions',
        ] as $table) {
            if (! Schema::hasTable($table)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Modern Farms is not ready',
                ], 503);
            }
        }
    } catch (Throwable) {
        return response()->json([
            'success' => false,
            'message' => 'Modern Farms is not ready',
        ], 503);
    }

    return response()->json([
        'success' => true,
        'message' => 'Modern Farms is ready',
    ]);
})->name('api.health');

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthApiController::class, 'register'])->middleware('throttle:register');
    Route::post('/login', [AuthApiController::class, 'login'])->middleware('throttle:login');
    Route::get('/me', [AuthApiController::class, 'current'])
        ->middleware(['auth:sanctum', 'account.active']);
    Route::post('/logout', [AuthApiController::class, 'logout'])
        ->middleware('auth:sanctum');
});

Route::apiResource('farms', FarmApiController::class)
    ->middleware(['auth:sanctum', 'account.active']);

Route::get('/dashboard/producer', [ProducerDashboardController::class, 'show'])
    ->middleware(['auth:sanctum', 'account.active']);

Route::get('/products', [ProductApiController::class, 'index']);
Route::middleware(['auth:sanctum', 'account.active'])->group(function () {
    Route::get('/products/my-products', [ProductApiController::class, 'mine']);
    Route::get('/products/inventory', [ProductApiController::class, 'inventory']);
    Route::post('/products/bulk', [ProductApiController::class, 'bulk']);
    Route::post('/products', [ProductApiController::class, 'store']);
    Route::put('/products/{product}', [ProductApiController::class, 'update']);
    Route::delete('/products/{product}', [ProductApiController::class, 'destroy']);

    Route::get('/orders', [OrderApiController::class, 'index']);
    Route::post('/orders', [OrderApiController::class, 'store']);
    Route::get('/orders/my-orders', [OrderApiController::class, 'mine']);
    Route::get('/orders/producer-orders', [OrderApiController::class, 'producerOrders']);
    Route::get('/orders/{order}', [OrderApiController::class, 'show']);
    Route::put('/orders/{order}/status', [OrderApiController::class, 'updateStatus']);

    Route::get('/messages/producers', [MessageApiController::class, 'producers']);
    Route::get('/messages/conversations', [MessageApiController::class, 'index']);
    Route::post('/messages/conversations', [MessageApiController::class, 'store']);
    Route::get('/messages/conversations/{conversation}', [MessageApiController::class, 'show']);
    Route::post('/messages/conversations/{conversation}', [MessageApiController::class, 'send']);

    Route::prefix('admin')->group(function () {
        Route::get('/stats', [AdminApiController::class, 'stats']);
        Route::get('/producers', [AdminApiController::class, 'producers']);
        Route::put('/producers/{producer}/approval', [AdminApiController::class, 'approveProducer']);
        Route::get('/customers', [AdminApiController::class, 'customers']);
        Route::get('/products', [AdminApiController::class, 'products']);
        Route::put('/products/{product}/status', [AdminApiController::class, 'setProductStatus']);
    });
});

Route::get('/products/{product}', [ProductApiController::class, 'show']);
