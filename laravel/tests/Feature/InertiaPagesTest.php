<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InertiaPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_page_is_an_inertia_page(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('LandingPage')
            );
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
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboards/Customer')
                ->where('auth.user.full_name', 'Farm Customer')
            );
    }

    public function test_producer_registration_waits_for_approval_before_login(): void
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
        ])->assertSessionHasErrors('email');
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
