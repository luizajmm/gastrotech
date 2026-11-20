<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoriaController;
use App\Http\Controllers\Api\ConfiguracaoController;
use App\Http\Controllers\Api\CupomController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FinanceiroController;
use App\Http\Controllers\Api\OpcoesController;
use App\Http\Controllers\Api\PedidoController;
use App\Http\Controllers\Api\ProdutoController;
use App\Http\Controllers\Api\TotemController;
use App\Http\Controllers\Api\TotensController;
use App\Http\Controllers\Api\UsuarioController;
use Illuminate\Support\Facades\Route;

// totem (sem login)

Route::prefix('totem')->group(function () {
    Route::get('cardapio', [TotemController::class, 'cardapio']);
    Route::post('pedidos', [TotemController::class, 'criarPedido'])->middleware('throttle:totem');
    Route::get('pedidos/{codigo}', [TotemController::class, 'acompanhar']);
    Route::post('pedidos/{codigo}/avaliacao', [TotemController::class, 'avaliar'])->middleware('throttle:totem');
    Route::get('cupons/{codigo}', [TotemController::class, 'cupom'])->middleware('throttle:totem');
    Route::get('fidelidade/{telefone}', [TotemController::class, 'fidelidade'])->middleware('throttle:totem');
});

Route::get('opcoes', OpcoesController::class);

Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');

// equipe (com login)

Route::middleware(['auth:sanctum', 'ativo'])->group(function () {
    Route::get('eu', [AuthController::class, 'eu']);
    Route::post('logout', [AuthController::class, 'logout']);

    Route::get('dashboard', DashboardController::class);

    // cardápio
    Route::middleware('can:ver-cardapio')->group(function () {
        Route::apiResource('categorias', CategoriaController::class)
            ->parameters(['categorias' => 'categoria'])
            ->only(['index', 'show']);
        Route::apiResource('produtos', ProdutoController::class)
            ->parameters(['produtos' => 'produto'])
            ->only(['index', 'show']);
        Route::get('cupons', [CupomController::class, 'index']);
        Route::get('clientes', [CupomController::class, 'clientes']);
    });

    Route::middleware('can:cardapio')->group(function () {
        Route::apiResource('categorias', CategoriaController::class)
            ->parameters(['categorias' => 'categoria'])
            ->only(['store', 'update', 'destroy']);
        Route::apiResource('produtos', ProdutoController::class)
            ->parameters(['produtos' => 'produto'])
            ->only(['store', 'update', 'destroy']);
        Route::apiResource('cupons', CupomController::class)
            ->parameters(['cupons' => 'cupom'])
            ->only(['store', 'update', 'destroy']);
        Route::post('produtos/{produto}/imagem', [ProdutoController::class, 'enviarImagem']);
        Route::delete('produtos/{produto}/imagem', [ProdutoController::class, 'removerImagem']);
    });

    // pedidos / cozinha
    Route::middleware('can:ver-pedidos')->group(function () {
        Route::get('pedidos', [PedidoController::class, 'index']);
        Route::get('pedidos/{pedido}', [PedidoController::class, 'show']);
    });

    Route::middleware('can:pedidos')->group(function () {
        Route::post('pedidos/{pedido}/avancar', [PedidoController::class, 'avancar']);
        Route::post('pedidos/{pedido}/cancelar', [PedidoController::class, 'cancelar']);
        Route::post('pedidos/{pedido}/pagamento', [PedidoController::class, 'confirmarPagamento']);
    });

    // financeiro
    Route::prefix('financeiro')->middleware('can:ver-caixa')->group(function () {
        Route::get('vendas', [FinanceiroController::class, 'vendas']);
        Route::get('vendas/pedidos', [FinanceiroController::class, 'pedidos']);
        Route::get('caixa', [FinanceiroController::class, 'caixa']);
        Route::get('caixas', [FinanceiroController::class, 'historicoCaixas']);
        Route::get('movimentos', [FinanceiroController::class, 'movimentos']);

        Route::middleware('can:caixa')->group(function () {
            Route::post('caixa/abrir', [FinanceiroController::class, 'abrirCaixa']);
            Route::post('caixa/fechar', [FinanceiroController::class, 'fecharCaixa']);
            Route::post('movimentos', [FinanceiroController::class, 'registrarMovimento']);
        });
    });

    // usuários
    Route::apiResource('usuarios', UsuarioController::class)
        ->parameters(['usuarios' => 'usuario'])
        ->middleware('can:usuarios');

    // configurações e totens
    Route::get('configuracoes', [ConfiguracaoController::class, 'show']);
    Route::get('totens', [TotensController::class, 'index'])->middleware('can:ver-configuracoes');

    Route::middleware('can:configuracoes')->group(function () {
        Route::put('configuracoes', [ConfiguracaoController::class, 'update']);
        Route::post('configuracoes/logo', [ConfiguracaoController::class, 'enviarLogo']);
        Route::apiResource('totens', TotensController::class)
            ->parameters(['totens' => 'totem'])
            ->only(['store', 'update', 'destroy']);
    });
});
