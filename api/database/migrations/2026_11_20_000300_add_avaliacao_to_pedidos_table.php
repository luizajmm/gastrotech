<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// o cliente dá uma nota de 1 a 5 depois que o pedido fica pronto
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->unsignedTinyInteger('avaliacao')->nullable()->after('finalizado_em');
            $table->string('avaliacao_comentario', 280)->nullable()->after('avaliacao');
            $table->timestamp('avaliado_em')->nullable()->after('avaliacao_comentario');

            $table->index('avaliado_em');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropIndex(['avaliado_em']);
            $table->dropColumn(['avaliacao', 'avaliacao_comentario', 'avaliado_em']);
        });
    }
};
