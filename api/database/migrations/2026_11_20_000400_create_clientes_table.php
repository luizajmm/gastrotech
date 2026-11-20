<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// cartão fidelidade: o cliente se identifica só pelo celular
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->string('telefone', 11)->unique(); // só os números, com DDD
            $table->unsignedInteger('selos')->default(0);
            $table->unsignedInteger('resgates')->default(0);
            $table->timestamp('ultimo_pedido_em')->nullable();
            $table->timestamps();
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->foreignId('cliente_id')->nullable()->after('totem_id')->constrained('clientes')->nullOnDelete();
            $table->boolean('fidelidade_resgate')->default(false)->after('cupom_codigo');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cliente_id');
            $table->dropColumn('fidelidade_resgate');
        });

        Schema::dropIfExists('clientes');
    }
};
