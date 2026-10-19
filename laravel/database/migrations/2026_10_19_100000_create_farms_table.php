<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('farms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producer_id')->constrained('users')->cascadeOnDelete();
            $table->string('farm_name', 150);
            $table->text('description')->nullable();
            $table->string('location', 200)->nullable();
            $table->string('county', 100)->nullable();
            $table->decimal('farm_size', 12, 2)->nullable();
            $table->string('farm_size_unit', 30)->default('acres');
            $table->string('phone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('farms');
    }
};
