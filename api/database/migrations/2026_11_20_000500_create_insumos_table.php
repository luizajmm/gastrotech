<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// ficha técnica: cada produto gasta um pouco de cada insumo,
// e o insumo tem estoque próprio (pão, carne, batata...)
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insumos', function (Blueprint $table) {
            $table->id();
            $table->string('nome', 80)->unique();
            $table->string('unidade', 4); // un, g, kg, ml, l
            $table->decimal('estoque', 12, 3)->default(0);
            $table->decimal('estoque_minimo', 12, 3)->nullable();
            $table->timestamps();
        });

        Schema::create('produto_insumo', function (Blueprint $table) {
            $table->foreignId('produto_id')->constrained('produtos')->cascadeOnDelete();
            $table->foreignId('insumo_id')->constrained('insumos')->restrictOnDelete();
            $table->decimal('quantidade', 10, 3);

            $table->primary(['produto_id', 'insumo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produto_insumo');
        Schema::dropIfExists('insumos');
    }
};
