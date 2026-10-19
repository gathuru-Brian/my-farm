<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('category', 100);
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2);
            $table->string('unit', 50)->default('kg');
            $table->decimal('quantity_posted', 12, 2)->default(0);
            $table->decimal('quantity_sold', 12, 2)->default(0);
            $table->decimal('quantity_remaining', 12, 2)->default(0);
            $table->string('image')->nullable();
            $table->string('status', 30)->default('available');
            $table->timestamps();
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
