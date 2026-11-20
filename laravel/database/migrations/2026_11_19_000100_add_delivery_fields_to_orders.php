<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_method', 30)->default('pay_on_delivery')->after('payment_status');
            $table->decimal('delivery_fee', 12, 2)->default(0)->after('payment_method');
            $table->string('courier_name', 150)->nullable()->after('delivery_fee');
            $table->string('tracking_number', 150)->nullable()->after('courier_name');
            $table->timestamp('estimated_delivery_at')->nullable()->after('tracking_number');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'payment_method',
                'delivery_fee',
                'courier_name',
                'tracking_number',
                'estimated_delivery_at',
            ]);
        });
    }
};
