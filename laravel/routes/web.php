<?php

use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ConversationController;
use App\Http\Controllers\CustomerDashboardController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProducerDashboardController;
use App\Models\Farm;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

Route::get('/', function () {
    $tablesReady = Schema::hasTable('users')
        && Schema::hasTable('farms')
        && Schema::hasTable('products');

    if (! $tablesReady) {
        return Inertia::render('LandingPage', [
            'stats' => ['farmers' => 0, 'farms' => 0, 'products' => 0],
            'featured' => [],
        ]);
    }

    $featured = Product::query()
        ->with(['farm.producer'])
        ->where('status', 'available')
        ->where('quantity_remaining', '>', 0)
        ->whereHas('farm', fn ($farms) => $farms
            ->where('status', 'active')
            ->whereHas('producer', fn ($producers) => $producers->where('status', 'active')))
        ->latest()
        ->limit(6)
        ->get()
        ->map(fn (Product $product): array => [
            'id' => $product->id,
            'name' => $product->name,
            'category' => $product->category,
            'farm' => $product->farm?->farm_name ?? 'Local farm',
            'place' => $product->farm?->county ?? $product->farm?->location ?? 'Kenya',
            'price' => 'KES '.number_format((float) $product->price, 2),
            'unit' => 'per '.$product->unit,
            'tag' => 'Available now',
            'icon' => '🌿',
            'image' => $product->image,
        ])
        ->values();

    return Inertia::render('LandingPage', [
        'stats' => [
            'farmers' => User::query()->where('role', 'producer')->where('status', 'active')->count(),
            'products' => Product::query()->where('status', 'available')->where('quantity_remaining', '>', 0)->count(),
            'farms' => Farm::query()->where('status', 'active')->count(),
        ],
        'featured' => $featured,
    ]);
})->name('home');

Route::get('/about', fn () => Inertia::render('About'))
    ->name('about');
Route::get('/services', fn () => Inertia::render('Services'))
    ->name('services');
Route::get('/gallery', fn () => Inertia::render('Gallery'))
    ->name('gallery');
Route::get('/farm-tour', fn () => Inertia::render('FarmTour'))
    ->name('farm-tour');
Route::get('/blog', fn () => Inertia::render('Blog'))
    ->name('blog');
Route::get('/products/{product}', function (Product $product) {
    abort_unless(
        $product->status === 'available'
            && $product->quantity_remaining > 0
            && $product->farm?->status === 'active'
            && $product->farm?->producer?->status === 'active',
        404,
    );

    return Inertia::render('PublicProduct', [
        'product' => [
            'id' => $product->id,
            'name' => $product->name,
            'category' => $product->category,
            'description' => $product->description,
            'price' => (float) $product->price,
            'unit' => $product->unit,
            'quantity_remaining' => (float) $product->quantity_remaining,
            'image' => $product->image,
            'farm' => [
                'id' => $product->farm_id,
                'name' => $product->farm?->farm_name,
                'location' => $product->farm?->location,
                'county' => $product->farm?->county,
                'producer_name' => $product->farm?->producer?->full_name,
            ],
        ],
    ]);
})->name('products.show');

Route::get('/farms/{farm}', function (Farm $farm) {
    abort_unless($farm->status === 'active' && $farm->producer?->status === 'active', 404);

    $products = $farm->products()
        ->where('status', 'available')
        ->where('quantity_remaining', '>', 0)
        ->latest()
        ->get()
        ->map(fn (Product $product): array => [
            'id' => $product->id,
            'name' => $product->name,
            'category' => $product->category,
            'price' => (float) $product->price,
            'unit' => $product->unit,
            'quantity_remaining' => (float) $product->quantity_remaining,
            'image' => $product->image,
        ])
        ->values();

    return Inertia::render('PublicFarm', [
        'farm' => [
            'id' => $farm->id,
            'name' => $farm->farm_name,
            'description' => $farm->description,
            'location' => $farm->location,
            'county' => $farm->county,
            'producer_name' => $farm->producer?->full_name,
        ],
        'products' => $products,
    ]);
})->name('farms.show');

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
Route::post('/dashboard/payments/{payment}/mpesa/query', [CustomerDashboardController::class, 'queryMpesaPayment'])
    ->middleware(['auth', 'account.usable'])
    ->name('dashboard.payments.mpesa.query');
Route::post('/dashboard/payments/{payment}/mpesa/retry', [CustomerDashboardController::class, 'retryMpesaPayment'])
    ->middleware(['auth', 'account.usable'])
    ->name('dashboard.payments.mpesa.retry');
Route::post('/dashboard/orders/{order}/cancel', [CustomerDashboardController::class, 'cancelOrder'])
    ->middleware(['auth', 'account.usable'])
    ->name('dashboard.orders.cancel');

Route::middleware(['auth', 'account.usable'])->prefix('dashboard')->name('dashboard.')->group(function () {
    Route::post('/admin/producers', [AdminDashboardController::class, 'inviteProducer'])->name('admin.producers.store');
    Route::post('/admin/producers/{producer}/invitation', [AdminDashboardController::class, 'resendProducerInvitation'])->name('admin.producers.invitation');
    Route::put('/admin/producers/{producer}/status', [AdminDashboardController::class, 'updateProducerStatus'])->name('admin.producers.status');
    Route::put('/admin/products/{product}/status', [AdminDashboardController::class, 'updateProductStatus'])->name('admin.products.status');
    Route::put('/admin/contact-messages/{contactMessage}/review', [AdminDashboardController::class, 'markContactMessageReviewed'])->name('admin.contact-messages.review');
    Route::post('/farms', [ProducerDashboardController::class, 'storeFarm'])->name('farms.store');
    Route::put('/farms/{farm}', [ProducerDashboardController::class, 'updateFarm'])->name('farms.update');
    Route::delete('/farms/{farm}', [ProducerDashboardController::class, 'destroyFarm'])->name('farms.destroy');
    Route::post('/products', [ProducerDashboardController::class, 'storeProduct'])->name('products.store');
    Route::post('/products/bulk', [ProducerDashboardController::class, 'storeProductsInBulk'])->name('products.bulk');
    Route::put('/products/{product}', [ProducerDashboardController::class, 'updateProduct'])->name('products.update');
    Route::delete('/products/{product}', [ProducerDashboardController::class, 'destroyProduct'])->name('products.destroy');
    Route::post('/orders/{order}/status', [ProducerDashboardController::class, 'updateOrderStatus'])->name('orders.status');
    Route::post('/messages/conversations', [ConversationController::class, 'store'])->name('messages.conversations.store');
    Route::post('/messages/conversations/{conversation}/read', [ConversationController::class, 'markRead'])->name('messages.conversations.read');
    Route::post('/messages/conversations/{conversation}', [ConversationController::class, 'send'])->name('messages.conversations.send');
});
