<?php

namespace Tests\Feature;

use App\Models\ContactMessage;
use App\Models\Farm;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class InertiaPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dashboard_reports_sales_and_pending_payment_totals(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'customer']);
        $producer = User::factory()->create(['role' => 'producer', 'status' => 'active']);
        $farm = Farm::create([
            'producer_id' => $producer->id,
            'farm_name' => 'Green Valley Farm',
        ]);
        $product = Product::create([
            'farm_id' => $farm->id,
            'name' => 'Tomatoes',
            'category' => 'Vegetables',
            'price' => 60,
            'quantity_posted' => 10,
            'quantity_remaining' => 10,
        ]);

        $paidOrder = Order::create([
            'customer_id' => $customer->id,
            'total_amount' => 60,
            'status' => 'delivered',
            'payment_status' => 'paid',
        ]);
        OrderItem::create([
            'order_id' => $paidOrder->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 60,
            'subtotal' => 60,
        ]);
        Order::create([
            'customer_id' => $customer->id,
            'total_amount' => 40,
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);
        $cancelledOrder = Order::create([
            'customer_id' => $customer->id,
            'total_amount' => 200,
            'status' => 'cancelled',
            'payment_status' => 'pending',
        ]);
        OrderItem::create([
            'order_id' => $cancelledOrder->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 200,
            'subtotal' => 200,
        ]);

        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboards/Admin')
                ->where('stats.sales_total', 100)
                ->where('stats.pending_payments', 1)
                ->where('stats.pending_payments_total', 40)
                ->where('salesByDay.0.revenue', 100)
                ->where('salesByDay.0.orders', 3)
                ->where('topFarmsThisWeek.0.name', 'Green Valley Farm')
                ->where('topFarmsThisWeek.0.sales', 60)
            );
    }

    public function test_mpesa_callback_marks_linked_orders_as_paid(): void
    {
        Http::fake([
            '*oauth/v1/generate*' => Http::response(['access_token' => 'test-token'], 200),
            '*mpesa/stkpushquery/v1/query' => Http::response([
                'ResultCode' => '0',
                'ResultDesc' => 'The service request is processed successfully.',
            ], 200),
        ]);

        $customer = User::factory()->create(['role' => 'customer']);
        $producer = User::factory()->create(['role' => 'producer', 'status' => 'active']);
        $farm = $producer->farms()->create([
            'farm_name' => 'Payment Farm',
            'status' => 'active',
        ]);
        $product = $farm->products()->create([
            'name' => 'Cabbage',
            'category' => 'Vegetables',
            'price' => 100,
            'quantity_posted' => 10,
            'quantity_remaining' => 10,
        ]);
        $order = Order::create([
            'customer_id' => $customer->id,
            'farm_id' => $farm->id,
            'total_amount' => 100,
            'delivery_address' => 'Nairobi',
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 100,
            'subtotal' => 100,
        ]);
        $payment = Payment::create([
            'customer_id' => $customer->id,
            'order_id' => $order->id,
            'order_ids' => [$order->id],
            'provider' => 'mpesa',
            'amount' => 100,
            'phone' => '254712345678',
            'status' => 'processing',
            'checkout_request_id' => 'ws_CO_TEST',
            'merchant_request_id' => 'merchant_TEST',
        ]);

        $callback = [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => $payment->merchant_request_id,
                    'CheckoutRequestID' => $payment->checkout_request_id,
                    'ResultCode' => 0,
                    'ResultDesc' => 'The service request is processed successfully.',
                    'CallbackMetadata' => [
                        'Item' => [
                            ['Name' => 'MpesaReceiptNumber', 'Value' => 'TEST123'],
                            ['Name' => 'Amount', 'Value' => 100],
                            ['Name' => 'PhoneNumber', 'Value' => 254712345678],
                        ],
                    ],
                ],
            ],
        ];

        $mismatchedCallback = $callback;
        $mismatchedCallback['Body']['stkCallback']['CallbackMetadata']['Item'][1]['Value'] = 99;

        $this->postJson('/api/mpesa/callback', $mismatchedCallback)
            ->assertBadRequest()
            ->assertJson(['success' => false]);

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'processing']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'payment_status' => 'pending']);

        $this->postJson('/api/mpesa/callback', $callback)
            ->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'paid',
            'mpesa_receipt' => 'TEST123',
        ]);
        $this->assertDatabaseHas('mpesa_transactions', [
            'payment_id' => $payment->id,
            'checkout_request_id' => $payment->checkout_request_id,
            'status' => 'paid',
            'mpesa_receipt' => 'TEST123',
        ]);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'payment_status' => 'paid',
        ]);

        $this->postJson('/api/mpesa/callback', [
            'Body' => [
                'stkCallback' => [
                    'MerchantRequestID' => $payment->merchant_request_id,
                    'CheckoutRequestID' => $payment->checkout_request_id,
                    'ResultCode' => 1032,
                    'ResultDesc' => 'Request cancelled by user.',
                ],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('payments', ['id' => $payment->id, 'status' => 'paid']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'payment_status' => 'paid']);
    }

    public function test_customer_can_retry_failed_mpesa_payment_without_creating_duplicate_orders(): void
    {
        Http::fake([
            '*oauth/v1/generate*' => Http::response(['access_token' => 'test-token'], 200),
            '*mpesa/stkpush/v1/processrequest' => Http::response([
                'ResponseCode' => '0',
                'CheckoutRequestID' => 'ws_CO_RETRY',
                'MerchantRequestID' => 'merchant_RETRY',
                'CustomerMessage' => 'Success. Request accepted for processing',
            ], 200),
        ]);

        $customer = User::factory()->create(['role' => 'customer']);
        $order = Order::create([
            'customer_id' => $customer->id,
            'total_amount' => 100,
            'delivery_address' => 'Nairobi',
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);
        $payment = Payment::create([
            'customer_id' => $customer->id,
            'order_id' => $order->id,
            'order_ids' => [$order->id],
            'provider' => 'mpesa',
            'amount' => 100,
            'phone' => '254712345678',
            'status' => 'failed',
        ]);

        $this->actingAs($customer)
            ->post("/dashboard/payments/{$payment->id}/mpesa/retry")
            ->assertRedirect()
            ->assertSessionHas('status', 'Check your phone and enter your M-Pesa PIN to complete the payment.');

        $this->assertDatabaseCount('orders', 1);
        $this->assertDatabaseCount('payments', 2);
        $this->assertDatabaseHas('payments', [
            'customer_id' => $customer->id,
            'checkout_request_id' => 'ws_CO_RETRY',
            'status' => 'processing',
        ]);
        $this->assertDatabaseHas('mpesa_transactions', [
            'checkout_request_id' => 'ws_CO_RETRY',
            'status' => 'processing',
        ]);
    }

    public function test_producer_can_save_delivery_details_and_customer_can_view_them(): void
    {
        $producer = User::factory()->create(['role' => 'producer', 'status' => 'active']);
        $farm = $producer->farms()->create([
            'farm_name' => 'Delivery Farm',
            'status' => 'active',
        ]);
        $product = $farm->products()->create([
            'name' => 'Carrots',
            'category' => 'Vegetables',
            'price' => 80,
            'quantity_posted' => 10,
            'quantity_remaining' => 10,
        ]);
        $customer = User::factory()->create(['role' => 'customer']);
        $order = Order::create([
            'customer_id' => $customer->id,
            'farm_id' => $farm->id,
            'total_amount' => 80,
            'delivery_address' => 'Nairobi',
            'status' => 'confirmed',
            'payment_status' => 'pending',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 80,
            'subtotal' => 80,
        ]);

        $this->actingAs($producer)
            ->post("/dashboard/orders/{$order->id}/status", [
                'delivery_fee' => '150.00',
                'courier_name' => 'Farm delivery',
                'tracking_number' => 'MF-TRACK-001',
                'estimated_delivery_at' => '2030-06-15T10:30',
            ])
            ->assertRedirect('/dashboard')
            ->assertSessionHas('status', 'Delivery information updated.');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'confirmed',
            'delivery_fee' => 150,
            'courier_name' => 'Farm delivery',
            'tracking_number' => 'MF-TRACK-001',
        ]);

        $this->actingAs($customer)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboards/Customer')
                ->where('orders.0.courier_name', 'Farm delivery')
                ->where('orders.0.tracking_number', 'MF-TRACK-001')
                ->where('orders.0.delivery_fee', 150)
            );
    }

    public function test_producer_cannot_update_delivery_details_for_another_farm_order(): void
    {
        $owner = User::factory()->create(['role' => 'producer', 'status' => 'active']);
        $otherProducer = User::factory()->create(['role' => 'producer', 'status' => 'active']);
        $farm = $owner->farms()->create(['farm_name' => 'Order Farm', 'status' => 'active']);
        $product = $farm->products()->create([
            'name' => 'Potatoes',
            'category' => 'Vegetables',
            'price' => 50,
            'quantity_posted' => 5,
            'quantity_remaining' => 5,
        ]);
        $order = Order::create([
            'customer_id' => User::factory()->create(['role' => 'customer'])->id,
            'farm_id' => $farm->id,
            'total_amount' => 50,
            'delivery_address' => 'Nairobi',
            'status' => 'confirmed',
            'payment_status' => 'pending',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 50,
            'subtotal' => 50,
        ]);

        $this->actingAs($otherProducer)
            ->post("/dashboard/orders/{$order->id}/status", ['tracking_number' => 'NOT-AUTHORIZED'])
            ->assertForbidden();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'tracking_number' => null,
        ]);
    }

    public function test_contact_message_is_saved_and_visible_to_admin_when_email_delivery_fails(): void
    {
        config(['services.contact.address' => 'support@example.test']);
        Mail::shouldReceive('raw')
            ->once()
            ->andThrow(new TransportException('SMTP unavailable'));

        $this->from('/contact')
            ->post('/contact', [
                'name' => 'Farm Customer',
                'email' => 'customer@example.test',
                'phone' => '0712345678',
                'topic' => 'Order help',
                'message' => 'Please help me with a recent order.',
            ])
            ->assertRedirect('/contact')
            ->assertSessionHas('status', 'Your message was received. Our team will reply by email within one working day.');

        $this->assertDatabaseHas('contact_messages', [
            'email' => 'customer@example.test',
            'topic' => 'Order help',
            'email_status' => 'failed',
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        $messageId = ContactMessage::query()->value('id');
        $this->actingAs($admin)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboards/Admin')
                ->where('contactMessages.0.email_status', 'failed')
                ->where('contactMessages.0.message', 'Please help me with a recent order.')
            );

        $this->put("/dashboard/admin/contact-messages/{$messageId}/review")
            ->assertRedirect('/dashboard')
            ->assertSessionHas('status', 'Contact message marked as reviewed.');

        $this->assertDatabaseMissing('contact_messages', [
            'id' => $messageId,
            'reviewed_at' => null,
        ]);
    }

    public function test_contact_message_is_saved_when_email_notification_is_sent(): void
    {
        config(['services.contact.address' => 'support@example.test']);
        Mail::shouldReceive('raw')->once();

        $this->post('/contact', [
            'name' => 'Farm Customer',
            'email' => 'customer@example.test',
            'topic' => 'Buying produce',
            'message' => 'I would like to know when the next harvest is available.',
        ])
            ->assertRedirect()
            ->assertSessionHas('status');

        $this->assertDatabaseHas('contact_messages', [
            'email' => 'customer@example.test',
            'email_status' => 'sent',
        ]);
    }

    public function test_health_endpoint_requires_payment_and_contact_tables(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Modern Farms is ready',
            ]);
    }

    public function test_admin_can_invite_a_pending_producer_to_set_their_password(): void
    {
        Notification::fake();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->post('/dashboard/admin/producers', [
                'full_name' => 'New Grower',
                'email' => '  NEW.GROWER@EXAMPLE.TEST ',
                'phone' => '+254700000000',
            ])
            ->assertRedirect()
            ->assertSessionHas('status', 'Producer invitation sent. The account will remain pending until approved.');

        $producer = User::where('email', 'new.grower@example.test')->firstOrFail();
        $this->assertSame('producer', $producer->role);
        $this->assertSame('pending', $producer->status);

        $token = null;
        Notification::assertSentTo($producer, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });
        $this->assertNotNull($token);
        $this->post('/logout')->assertRedirect('/');

        $this->post('/reset-password', [
            'token' => $token,
            'email' => $producer->email,
            'password' => 'producer-setup-password',
            'password_confirmation' => 'producer-setup-password',
        ])->assertRedirect('/login');

        $this->assertTrue(Hash::check('producer-setup-password', $producer->fresh()->password_hash));
        $this->assertSame('pending', $producer->fresh()->status);
    }

    public function test_only_admins_can_invite_producers(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer)
            ->post('/dashboard/admin/producers', [
                'full_name' => 'Unauthorized Producer',
                'email' => 'unauthorized@example.test',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'unauthorized@example.test']);
    }

    public function test_smtp_failure_keeps_the_pending_producer_and_allows_resending_the_invitation(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $sendAttempts = 0;
        Password::shouldReceive('sendResetLink')
            ->twice()
            ->andReturnUsing(function () use (&$sendAttempts): string {
                if (++$sendAttempts === 1) {
                    throw new TransportException('SMTP unavailable');
                }

                return Password::RESET_LINK_SENT;
            });

        $this->actingAs($admin)
            ->post('/dashboard/admin/producers', [
                'full_name' => 'Retry Grower',
                'email' => 'retry.grower@example.test',
            ])
            ->assertRedirect()
            ->assertSessionHas('warning', 'The producer account was saved, but the invitation email could not be sent. Check your SMTP settings, clear Laravel’s configuration cache, wait one minute, then use “Resend invitation” from the Farmers tab.');

        $producer = User::where('email', 'retry.grower@example.test')->firstOrFail();
        $this->assertSame('pending', $producer->status);

        $this->post("/dashboard/admin/producers/{$producer->id}/invitation")
            ->assertRedirect()
            ->assertSessionHas('status', 'Producer invitation sent.');

        $this->assertSame('pending', $producer->fresh()->status);
    }

    public function test_landing_page_is_an_inertia_page(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('LandingPage')
            );
    }

    public function test_public_information_pages_are_inertia_pages(): void
    {
        foreach ([
            '/about' => 'About',
            '/services' => 'Services',
            '/gallery' => 'Gallery',
            '/farm-tour' => 'FarmTour',
            '/blog' => 'Blog',
        ] as $uri => $component) {
            $this->get($uri)
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component($component)
                );
        }
    }

    public function test_password_recovery_pages_are_inertia_pages(): void
    {
        $this->get('/forgot-password')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/ForgotPassword')
            );

        $this->get('/reset-password/sample-token?email=customer%40example.test')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/ResetPassword')
                ->where('token', 'sample-token')
                ->where('email', 'customer@example.test')
            );
    }

    public function test_user_can_reset_password_using_a_valid_reset_link(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'reset@example.test']);

        $this->post('/forgot-password', ['email' => $user->email])
            ->assertRedirect()
            ->assertSessionHas('status');

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });
        $this->assertNotNull($token);

        $this->post('/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'a-new-secure-password',
            'password_confirmation' => 'a-new-secure-password',
        ])->assertRedirect('/login')
            ->assertSessionHas('status');

        $user->refresh();
        $this->assertTrue(Hash::check('a-new-secure-password', $user->password_hash));
        $this->post('/login', [
            'email' => $user->email,
            'password' => 'a-new-secure-password',
        ])->assertRedirect('/dashboard');
    }

    public function test_legacy_werkzeug_hash_requires_password_reset_without_hashing_error(): void
    {
        $user = User::factory()->create([
            'email' => 'legacy@example.test',
            'password_hash' => 'scrypt:32768:8:1$legacy-salt$legacy-digest',
        ]);

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'old-password',
        ])->assertRedirect()
            ->assertSessionHasErrors('email');
    }

    public function test_api_login_rejects_legacy_werkzeug_hash_without_hashing_error(): void
    {
        $user = User::factory()->create([
            'email' => 'legacy-api@example.test',
            'password_hash' => 'scrypt:32768:8:1$legacy-salt$legacy-digest',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'old-password',
        ])->assertUnauthorized()
            ->assertJsonPath('message', 'Invalid email or password.');
    }

    public function test_customer_can_register_and_reach_dashboard(): void
    {
        $response = $this->post('/register', [
            'full_name' => 'Farm Customer',
            'email' => 'customer@example.test',
            'phone' => '0712345678',
            'role' => 'customer',
            'password' => 'correct-horse-battery',
            'password_confirmation' => 'correct-horse-battery',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticated();
        $this->assertDatabaseHas('users', [
            'email' => 'customer@example.test',
            'role' => 'customer',
            'status' => 'active',
        ]);

        $this->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboards/Customer')
                ->where('auth.user.full_name', 'Farm Customer')
            );
    }

    public function test_customer_marketplace_receives_farm_inventory_and_sort_details(): void
    {
        $producer = User::factory()->create([
            'role' => 'producer',
            'status' => 'active',
        ]);
        $farm = $producer->farms()->create([
            'farm_name' => 'Green Valley Farms',
            'location' => 'Limuru',
            'county' => 'Kiambu',
            'status' => 'active',
        ]);
        $farm->products()->create([
            'name' => 'Fresh Avocado',
            'category' => 'Fruits',
            'price' => 180,
            'unit' => 'kg',
            'quantity_posted' => 20,
            'quantity_sold' => 3,
            'quantity_remaining' => 17,
            'status' => 'available',
        ]);
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer)
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboards/Customer')
                ->where('products.0.farm_id', $farm->id)
                ->where('products.0.farm_location', 'Limuru')
                ->where('products.0.farm_county', 'Kiambu')
                ->where('products.0.quantity_sold', 3)
                ->has('products.0.created_at')
            );
    }

    public function test_producer_can_bulk_add_products_to_an_owned_farm(): void
    {
        $producer = User::factory()->create([
            'role' => 'producer',
            'status' => 'active',
        ]);
        $farm = $producer->farms()->create([
            'farm_name' => 'Green Valley',
            'status' => 'active',
        ]);

        $this->actingAs($producer)
            ->post('/dashboard/products/bulk', [
                'products' => [
                    [
                        'farm_id' => $farm->id,
                        'name' => '  Tomatoes  ',
                        'category' => '  Vegetables  ',
                        'price' => '120.00',
                        'unit' => 'kg',
                        'quantity_posted' => '15.00',
                    ],
                    [
                        'farm_id' => $farm->id,
                        'name' => 'Spinach',
                        'category' => 'Vegetables',
                        'price' => '80.00',
                        'quantity_posted' => '10.00',
                    ],
                ],
            ])
            ->assertRedirect('/dashboard')
            ->assertSessionHas('status', '2 products added to your inventory.');

        $this->assertDatabaseHas('products', [
            'farm_id' => $farm->id,
            'name' => 'Tomatoes',
            'category' => 'Vegetables',
            'quantity_sold' => 0,
            'quantity_remaining' => 15,
            'status' => 'available',
        ]);
        $this->assertDatabaseHas('products', [
            'farm_id' => $farm->id,
            'name' => 'Spinach',
            'unit' => 'kg',
            'quantity_remaining' => 10,
        ]);
    }

    public function test_producer_bulk_product_api_uses_the_same_creation_rules(): void
    {
        $producer = User::factory()->create([
            'role' => 'producer',
            'status' => 'active',
        ]);
        $farm = $producer->farms()->create([
            'farm_name' => 'Highland Harvest',
            'status' => 'active',
        ]);
        $token = $producer->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/products/bulk', [
            'products' => [
                [
                    'farm_id' => $farm->id,
                    'name' => 'Green beans',
                    'category' => 'Vegetables',
                    'price' => '95.00',
                    'quantity_posted' => '12.00',
                ],
            ],
        ])->assertCreated()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('products.0.name', 'Green beans')
            ->assertJsonPath('products.0.unit', 'kg')
            ->assertJsonPath('products.0.quantity_remaining', '12.00');
    }

    public function test_bulk_product_creation_rejects_another_producers_farm_without_partial_creation(): void
    {
        $producer = User::factory()->create([
            'role' => 'producer',
            'status' => 'active',
        ]);
        $ownFarm = $producer->farms()->create([
            'farm_name' => 'My farm',
            'status' => 'active',
        ]);
        $otherProducer = User::factory()->create([
            'role' => 'producer',
            'status' => 'active',
        ]);
        $otherFarm = $otherProducer->farms()->create([
            'farm_name' => 'Another farm',
            'status' => 'active',
        ]);

        $this->actingAs($producer)
            ->post('/dashboard/products/bulk', [
                'products' => [
                    [
                        'farm_id' => $ownFarm->id,
                        'name' => 'Tomatoes',
                        'category' => 'Vegetables',
                        'price' => '120.00',
                        'quantity_posted' => '15.00',
                    ],
                    [
                        'farm_id' => $otherFarm->id,
                        'name' => 'Spinach',
                        'category' => 'Vegetables',
                        'price' => '80.00',
                        'quantity_posted' => '10.00',
                    ],
                ],
            ])
            ->assertNotFound();

        $this->assertDatabaseCount('products', 0);
    }

    public function test_pending_producer_can_sign_in_but_has_limited_dashboard(): void
    {
        $this->post('/register', [
            'full_name' => 'Farm Producer',
            'email' => 'producer@example.test',
            'role' => 'producer',
            'password' => 'correct-horse-battery',
            'password_confirmation' => 'correct-horse-battery',
        ])->assertRedirect('/dashboard');

        $producer = User::where('email', 'producer@example.test')->firstOrFail();
        $this->assertSame('pending', $producer->status);

        $this->post('/logout')->assertRedirect('/');
        $this->post('/login', [
            'email' => 'producer@example.test',
            'password' => 'correct-horse-battery',
        ])->assertRedirect('/dashboard');

        $this->assertAuthenticatedAs($producer);
        $this->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboards/Producer')
                ->where('farms', [])
                ->where('products', [])
            );
    }

    public function test_customer_can_place_an_order_and_inventory_is_updated(): void
    {
        $producer = User::factory()->create([
            'role' => 'producer',
            'status' => 'active',
        ]);
        $farm = $producer->farms()->create([
            'farm_name' => 'Green Acres',
            'status' => 'active',
        ]);
        $product = $farm->products()->create([
            'name' => 'Tomatoes',
            'category' => 'Vegetables',
            'price' => 100,
            'unit' => 'kg',
            'quantity_posted' => 5,
            'quantity_sold' => 0,
            'quantity_remaining' => 5,
            'status' => 'available',
        ]);
        $customer = User::factory()->create();
        $token = $customer->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/orders', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'delivery_address' => 'Nairobi',
        ])->assertCreated()
            ->assertJsonPath('order.total_amount', '200.00');

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'quantity_sold' => 2,
            'quantity_remaining' => 3,
            'status' => 'available',
        ]);
    }

    public function test_producer_can_delete_an_unordered_product_and_a_farm_with_its_products(): void
    {
        Storage::fake('public');
        $producer = User::factory()->create(['role' => 'producer', 'status' => 'active']);
        $farm = $producer->farms()->create(['farm_name' => 'Green Acres', 'status' => 'active']);
        $product = $farm->products()->create([
            'name' => 'Tomatoes',
            'category' => 'Vegetables',
            'price' => 100,
            'quantity_posted' => 5,
            'quantity_sold' => 0,
            'quantity_remaining' => 5,
            'image' => 'products/tomatoes.jpg',
        ]);
        Storage::disk('public')->put($product->image, 'image');

        $this->actingAs($producer)
            ->delete("/dashboard/products/{$product->id}")
            ->assertRedirect('/dashboard')
            ->assertSessionHas('status', 'Product deleted from your inventory.');

        $this->assertDatabaseMissing('products', ['id' => $product->id]);
        Storage::disk('public')->assertMissing('products/tomatoes.jpg');

        $anotherFarm = $producer->farms()->create(['farm_name' => 'Hill Farm', 'status' => 'active']);
        $anotherProduct = $anotherFarm->products()->create([
            'name' => 'Maize',
            'category' => 'Grains',
            'price' => 80,
            'quantity_posted' => 10,
            'quantity_sold' => 0,
            'quantity_remaining' => 10,
            'image' => 'products/maize.jpg',
        ]);
        Storage::disk('public')->put($anotherProduct->image, 'image');

        $this->delete("/dashboard/farms/{$anotherFarm->id}")
            ->assertRedirect('/dashboard')
            ->assertSessionHas('status', 'Farm and its products deleted.');

        $this->assertDatabaseMissing('farms', ['id' => $anotherFarm->id]);
        $this->assertDatabaseMissing('products', ['id' => $anotherProduct->id]);
        Storage::disk('public')->assertMissing('products/maize.jpg');
    }

    public function test_producer_cannot_delete_products_or_farms_with_order_history(): void
    {
        $producer = User::factory()->create(['role' => 'producer', 'status' => 'active']);
        $farm = $producer->farms()->create(['farm_name' => 'Green Acres', 'status' => 'active']);
        $product = $farm->products()->create([
            'name' => 'Tomatoes',
            'category' => 'Vegetables',
            'price' => 100,
            'quantity_posted' => 5,
            'quantity_sold' => 1,
            'quantity_remaining' => 4,
            'status' => 'available',
        ]);
        $order = Order::create([
            'customer_id' => User::factory()->create(['role' => 'customer'])->id,
            'farm_id' => $farm->id,
            'total_amount' => 100,
            'status' => 'delivered',
            'payment_status' => 'paid',
        ]);
        OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'quantity' => 1,
            'unit_price' => 100,
            'subtotal' => 100,
        ]);

        $this->actingAs($producer)
            ->delete("/dashboard/products/{$product->id}")
            ->assertSessionHasErrors(['product']);
        $this->delete("/dashboard/farms/{$farm->id}")
            ->assertSessionHasErrors(['farm']);

        $this->assertDatabaseHas('farms', ['id' => $farm->id]);
        $this->assertDatabaseHas('products', ['id' => $product->id]);
        $this->assertDatabaseHas('order_items', ['product_id' => $product->id]);
    }

    public function test_producer_cannot_delete_another_producers_farm_or_product(): void
    {
        $producer = User::factory()->create(['role' => 'producer', 'status' => 'active']);
        $otherProducer = User::factory()->create(['role' => 'producer', 'status' => 'active']);
        $farm = $otherProducer->farms()->create(['farm_name' => 'Other Farm', 'status' => 'active']);
        $product = $farm->products()->create([
            'name' => 'Tomatoes',
            'category' => 'Vegetables',
            'price' => 100,
            'quantity_posted' => 5,
            'quantity_sold' => 0,
            'quantity_remaining' => 5,
        ]);

        $this->actingAs($producer)
            ->delete("/dashboard/farms/{$farm->id}")
            ->assertNotFound();
        $this->delete("/dashboard/products/{$product->id}")
            ->assertNotFound();

        $this->assertDatabaseHas('farms', ['id' => $farm->id]);
        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_direct_message_conversation_is_private_to_its_participants(): void
    {
        $producer = User::factory()->create([
            'role' => 'producer',
            'status' => 'active',
        ]);
        $producer->farms()->create([
            'farm_name' => 'Green Acres',
            'status' => 'active',
        ]);
        $customer = User::factory()->create();
        $otherCustomer = User::factory()->create();
        $customerToken = $customer->createToken('customer')->plainTextToken;

        $conversationResponse = $this->withToken($customerToken)->postJson('/api/messages/conversations', [
            'producer_id' => $producer->id,
        ])->assertOk();
        $conversationId = $conversationResponse->json('conversation.id');

        $this->withToken($customerToken)->postJson("/api/messages/conversations/{$conversationId}", [
            'body' => 'Do you have tomatoes available?',
        ])->assertCreated();

        Sanctum::actingAs($otherCustomer);

        $this->getJson("/api/messages/conversations/{$conversationId}")
            ->assertNotFound();
    }
}
