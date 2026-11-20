<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\StatusPedido;
use App\Http\Requests\AvaliarPedidoRequest;
use App\Http\Requests\CriarPedidoRequest;
use App\Http\Resources\AcompanhamentoPedidoResource;
use App\Http\Resources\CategoriaResource;
use App\Models\Categoria;
use App\Models\Configuracao;
use App\Models\Pedido;
use App\Models\Produto;
use App\Services\FidelidadeService;
use App\Services\PedidoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TotemController extends Controller
{
    public function cardapio(): JsonResponse
    {
        $categorias = Categoria::query()
            ->ativas()
            ->ordenadas()
            ->with(['produtos' => fn ($q) => $q->disponiveis()->orderByDesc('destaque')->orderBy('nome')])
            ->get()
            ->filter(fn (Categoria $c) => $c->produtos->isNotEmpty())
            ->values();

        // produto sem categoria vai pra "Outros"
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

    // o totem confere o cupom antes do pagamento pra mostrar o desconto.
    // o valor de verdade é calculado de novo quando o pedido é criado
    public function cupom(Request $request, string $codigo, PedidoService $pedidos): JsonResponse
    {
        $subtotal = (float) $request->validate(['subtotal' => ['required', 'numeric', 'min:0']])['subtotal'];
        $cupom = $pedidos->conferirCupom($codigo, $subtotal);

        return response()->json([
            'data' => [
                'codigo' => $cupom->codigo,
                'descricao' => $cupom->descricao,
                'tipo' => $cupom->tipo->value,
                'valor' => (float) $cupom->valor,
                'pedido_minimo' => $cupom->pedido_minimo === null ? null : (float) $cupom->pedido_minimo,
                'desconto' => $cupom->descontoPara($subtotal),
            ],
        ]);
    }

    public function fidelidade(string $telefone, FidelidadeService $fidelidade): JsonResponse
    {
        return response()->json(['data' => $fidelidade->consultar($telefone)]);
    }

    // só depois que o pedido fica pronto, e uma vez só
    public function avaliar(AvaliarPedidoRequest $request, string $codigo): AcompanhamentoPedidoResource
    {
        $pedido = Pedido::query()->where('codigo', strtoupper(trim($codigo)))->firstOrFail();

        if (! in_array($pedido->status, [StatusPedido::Pronto, StatusPedido::Retirado], true)) {
            throw ValidationException::withMessages(['nota' => 'Dá para avaliar quando o pedido ficar pronto.']);
        }

        if ($pedido->avaliacao !== null) {
            throw ValidationException::withMessages(['nota' => 'Este pedido já foi avaliado. Obrigado!']);
        }

        $pedido->update([
            'avaliacao' => $request->integer('nota'),
            'avaliacao_comentario' => trim((string) $request->input('comentario')) ?: null,
            'avaliado_em' => now(),
        ]);

        return new AcompanhamentoPedidoResource($pedido->load('itens'));
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
