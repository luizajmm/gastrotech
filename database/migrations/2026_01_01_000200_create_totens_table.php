<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('totens', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->string('localizacao', 120);
            $table->string('status', 20)->default('online');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('totens');
    }
};
