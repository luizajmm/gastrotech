<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('totem_id')->nullable()->constrained('totens')->nullOnDelete();
            // gerado pelo id depois de salvar, assim não repete
            $table->string('codigo', 20)->nullable()->unique();
            $table->string('nome_cliente', 100)->nullable();
            $table->string('status', 20)->default('recebido');
            $table->string('status_pagamento', 20)->default('pendente');
            $table->string('forma_pagamento', 20);
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->unsignedInteger('tempo_estimado_min')->default(0);
            $table->timestamp('pago_em')->nullable();
            $table->timestamp('pronto_em')->nullable();
            $table->timestamp('finalizado_em')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['status_pagamento', 'created_at']);
        });

        Schema::create('itens_pedido', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->constrained('pedidos')->cascadeOnDelete();
            $table->foreignId('produto_id')->nullable()->constrained('produtos')->nullOnDelete();
            // guarda nome e preço pro histórico não mudar se editarem o produto
            $table->string('nome_produto', 140);
            $table->json('personalizacoes')->nullable(); // {"Gelo": "Sem gelo"}
            $table->string('observacao', 180)->nullable();
            $table->unsignedInteger('quantidade')->default(1);
            $table->decimal('preco_unitario', 10, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itens_pedido');
        Schema::dropIfExists('pedidos');
    }
};
