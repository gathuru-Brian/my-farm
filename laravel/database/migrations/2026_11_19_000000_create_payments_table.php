<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->json('order_ids')->nullable();
            $table->string('provider', 30)->default('mpesa');
            $table->decimal('amount', 12, 2);
            $table->string('phone', 30);
            $table->string('status', 30)->default('pending');
            $table->string('checkout_request_id')->nullable()->unique();
            $table->string('merchant_request_id')->nullable();
            $table->string('mpesa_receipt')->nullable();
            $table->integer('result_code')->nullable();
            $table->text('result_description')->nullable();
            $table->json('callback_payload')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
