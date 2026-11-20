<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cupons', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();
            $table->string('descricao', 120)->nullable();
            $table->string('tipo', 12); // percentual ou valor
            $table->decimal('valor', 10, 2);
            $table->decimal('pedido_minimo', 10, 2)->nullable();
            $table->date('validade')->nullable();
            $table->unsignedInteger('limite_usos')->nullable();
            $table->unsignedInteger('usos')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });

        // subtotal continua sendo a soma dos itens; o que o cliente paga é o total
        Schema::table('pedidos', function (Blueprint $table) {
            $table->decimal('desconto', 10, 2)->default(0)->after('subtotal');
            $table->decimal('total', 10, 2)->default(0)->after('desconto');
            $table->foreignId('cupom_id')->nullable()->after('total')->constrained('cupons')->nullOnDelete();
            $table->string('cupom_codigo', 30)->nullable()->after('cupom_id');
        });

        DB::table('pedidos')->update(['total' => DB::raw('subtotal')]);
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cupom_id');
            $table->dropColumn(['desconto', 'total', 'cupom_codigo']);
        });

        Schema::dropIfExists('cupons');
    }
};
