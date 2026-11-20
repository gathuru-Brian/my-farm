<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mpesa_transactions', function (Blueprint $table) {
            $table->foreignId('payment_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('checkout_request_id')->nullable()->unique();
            $table->string('merchant_request_id')->nullable();
            $table->string('mpesa_receipt')->nullable();
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('status', 30)->default('pending');
            $table->integer('result_code')->nullable();
            $table->text('result_description')->nullable();
            $table->json('callback_payload')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->index(['payment_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('mpesa_transactions', function (Blueprint $table) {
            $table->dropIndex(['payment_id', 'status']);
            $table->dropConstrainedForeignId('payment_id');
            $table->dropUnique(['checkout_request_id']);
            $table->dropColumn([
                'checkout_request_id',
                'merchant_request_id',
                'mpesa_receipt',
                'amount',
                'phone',
                'status',
                'result_code',
                'result_description',
                'callback_payload',
                'completed_at',
            ]);
        });
    }
};
