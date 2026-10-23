<?php

use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\CustomerDashboardController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProducerDashboardController;
use App\Http\Controllers\ContactController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('LandingPage'))
    ->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'create'])
        ->name('login');
    Route::post('/login', [AuthController::class, 'store'])
        ->middleware('throttle:login')
        ->name('login.store');
    Route::get('/register', [AuthController::class, 'register'])
        ->name('register');
    Route::post('/register', [AuthController::class, 'createAccount'])
        ->middleware('throttle:register')
        ->name('register.store');
    Route::get('/forgot-password', [PasswordResetController::class, 'create'])
        ->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'sendLink'])
        ->middleware('throttle:password-reset')
        ->name('password.email');
    Route::get('/reset-password/{token}', [PasswordResetController::class, 'edit'])
        ->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'update'])
        ->middleware('throttle:password-reset')
        ->name('password.update');
    Route::get('/contact', [ContactController::class, 'show'])
        ->name('contact');
    Route::post('/contact', [ContactController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('contact.store');
});

Route::post('/logout', [AuthController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

Route::get('/dashboard', function () {
    $user = request()->user();

    if ($user->role === 'customer') {
        return app()->call([app(CustomerDashboardController::class), 'show']);
    }

    if ($user->role === 'producer') {
        return app()->call([app(ProducerDashboardController::class), 'show']);
    }

    if (in_array($user->role, ['admin', 'administrator'], true)) {
        return app()->call([app(AdminDashboardController::class), 'show']);
    }

    abort(403);
})->middleware(['auth', 'account.usable'])->name('dashboard');

Route::post('/dashboard/orders', [CustomerDashboardController::class, 'placeOrder'])
    ->middleware(['auth', 'account.usable'])
    ->name('dashboard.orders.store');
Route::post('/dashboard/orders/{order}/cancel', [CustomerDashboardController::class, 'cancelOrder'])
    ->middleware(['auth', 'account.usable'])
    ->name('dashboard.orders.cancel');

Route::middleware(['auth', 'account.usable'])->prefix('dashboard')->name('dashboard.')->group(function () {
    Route::put('/admin/producers/{producer}/status', [AdminDashboardController::class, 'updateProducerStatus'])->name('admin.producers.status');
    Route::put('/admin/products/{product}/status', [AdminDashboardController::class, 'updateProductStatus'])->name('admin.products.status');
    Route::post('/farms', [ProducerDashboardController::class, 'storeFarm'])->name('farms.store');
    Route::put('/farms/{farm}', [ProducerDashboardController::class, 'updateFarm'])->name('farms.update');
    Route::post('/products', [ProducerDashboardController::class, 'storeProduct'])->name('products.store');
    Route::put('/products/{product}', [ProducerDashboardController::class, 'updateProduct'])->name('products.update');
    Route::post('/orders/{order}/status', [ProducerDashboardController::class, 'updateOrderStatus'])->name('orders.status');
    Route::post('/messages/conversations', [ConversationController::class, 'store'])->name('messages.conversations.store');
    Route::post('/messages/conversations/{conversation}/read', [ConversationController::class, 'markRead'])->name('messages.conversations.read');
    Route::post('/messages/conversations/{conversation}', [ConversationController::class, 'send'])->name('messages.conversations.send');
});
