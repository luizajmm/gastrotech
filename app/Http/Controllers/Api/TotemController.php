<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CriarPedidoRequest;
use App\Http\Resources\AcompanhamentoPedidoResource;
use App\Http\Resources\CategoriaResource;
use App\Models\Categoria;
use App\Models\Configuracao;
use App\Models\Pedido;
use App\Models\Produto;
use App\Services\PedidoService;
use Illuminate\Http\JsonResponse;

/**
 * Rotas públicas usadas pela tela do cliente (totem).
 */
class TotemController extends Controller
{
    /** Loja + categorias ativas com os produtos disponíveis. */
    public function cardapio(): JsonResponse
    {
        $categorias = Categoria::query()
            ->ativas()
            ->ordenadas()
            ->with(['produtos' => fn ($q) => $q->disponiveis()->orderByDesc('destaque')->orderBy('nome')])
            ->get()
            ->filter(fn (Categoria $c) => $c->produtos->isNotEmpty())
            ->values();

        // Produtos sem categoria também aparecem, num grupo "Outros".
        $semCategoria = Produto::query()->disponiveis()->whereNull('categoria_id')->orderBy('nome')->get();

        if ($semCategoria->isNotEmpty()) {
            $outros = new Categoria(['nome' => 'Outros', 'icone' => 'outros', 'ordem' => 999]);
            $outros->id = 0;
            $outros->setRelation('produtos', $semCategoria);
            $categorias->push($outros);
        }

        return response()->json([
            'loja' => Configuracao::publicas(),
            'categorias' => CategoriaResource::collection($categorias),
        ]);
    }

    public function criarPedido(CriarPedidoRequest $request, PedidoService $pedidos): JsonResponse
    {
        $pedido = $pedidos->criar($request->validated());

        return (new AcompanhamentoPedidoResource($pedido))
            ->response()
            ->setStatusCode(201);
    }

    public function acompanhar(string $codigo): AcompanhamentoPedidoResource
    {
        $pedido = Pedido::query()
            ->where('codigo', strtoupper(trim($codigo)))
            ->with('itens')
            ->firstOrFail();

        return new AcompanhamentoPedidoResource($pedido);
    }
}
