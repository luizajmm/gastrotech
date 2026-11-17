<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caixas', function (Blueprint $table) {
            $table->id();
            $table->decimal('saldo_inicial', 10, 2)->default(0);
            $table->decimal('saldo_final', 10, 2)->nullable();
            $table->string('status', 20)->default('aberto');
            $table->foreignId('aberto_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('fechado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aberto_em')->useCurrent();
            $table->timestamp('fechado_em')->nullable();
            $table->timestamps();
        });

        Schema::create('movimentos_caixa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caixa_id')->constrained('caixas')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('tipo', 20);
            $table->string('descricao', 180);
            $table->string('forma_pagamento', 20)->default('dinheiro');
            $table->decimal('valor', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimentos_caixa');
        Schema::dropIfExists('caixas');
    }
};
