<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produtos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('categoria_id')->nullable()->constrained('categorias')->nullOnDelete();
            $table->string('nome', 140);
            $table->string('descricao', 255)->nullable();
            // Antes eram textos separados por vírgula/pipe; agora JSON estruturado.
            $table->json('destaques')->nullable();        // ["Pão brioche", "Bacon"]
            $table->json('personalizacoes')->nullable();  // [{"nome": "Gelo", "opcoes": ["Com", "Sem"], "obrigatorio": true}]
            $table->text('ingredientes')->nullable();
            $table->json('tags')->nullable();
            $table->json('alergenos')->nullable();
            $table->string('porcao', 120)->nullable();
            $table->unsignedInteger('calorias')->nullable();
            $table->string('imagem')->nullable();
            $table->unsignedInteger('estoque')->default(0);
            $table->decimal('preco', 10, 2)->default(0);
            $table->unsignedInteger('tempo_preparo_min')->default(10);
            $table->boolean('destaque')->default(false);
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['ativo', 'categoria_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produtos');
    }
};
