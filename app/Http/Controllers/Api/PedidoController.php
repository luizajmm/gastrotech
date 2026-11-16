<?php

namespace App\Http\Controllers\Api;

use App\Enums\StatusPedido;
use App\Http\Controllers\Controller;
use App\Http\Resources\PedidoResource;
use App\Models\Pedido;
use App\Services\PedidoService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Fila da cozinha e histórico de pedidos.
 */
class PedidoController extends Controller
{
    public function __construct(private PedidoService $pedidos) {}

    /**
     * ?status=ativos (padrão: tudo que ainda não saiu), um status específico ou "todos".
     * ?busca= procura pelo código ou nome do cliente.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['ativos', 'todos', ...StatusPedido::valores()])],
            'busca' => ['nullable', 'string', 'max:60'],
            'por_pagina' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $status = $request->input('status', 'ativos');

        $consulta = Pedido::query()
            ->with(['itens', 'totem'])
            ->when($status === 'ativos', fn ($q) => $q->ativos()->oldest())
            ->when($status !== 'ativos', fn ($q) => $q->latest())
            ->when(! in_array($status, ['ativos', 'todos'], true), fn ($q) => $q->where('status', $status))
            ->when($request->filled('busca'), function ($q) use ($request) {
                $termo = $request->string('busca')->trim();
                $q->where(fn ($q) => $q->where('codigo', strtoupper($termo))
                    ->orWhere('nome_cliente', 'like', '%'.$termo.'%'));
            });

        // A fila ativa é pequena e vem inteira; o histórico é paginado.
        $resultado = $status === 'ativos'
            ? $consulta->get()
            : $consulta->paginate($request->integer('por_pagina', 20));

        return PedidoResource::collection($resultado)->additional([
            'contagens' => $this->contagens(),
        ]);
    }

    public function show(Pedido $pedido): PedidoResource
    {
        return new PedidoResource($pedido->load(['itens', 'totem']));
    }

    public function avancar(Pedido $pedido): PedidoResource
    {
        return new PedidoResource($this->pedidos->avancar($pedido));
    }

    public function cancelar(Pedido $pedido): PedidoResource
    {
        return new PedidoResource($this->pedidos->cancelar($pedido));
    }

    public function confirmarPagamento(Pedido $pedido): PedidoResource
    {
        return new PedidoResource($this->pedidos->confirmarPagamento($pedido));
    }

    /** Quantos pedidos em cada etapa (abas da cozinha). Retirados/cancelados contam só hoje. */
    private function contagens(): array
    {
        $porStatus = Pedido::query()
            ->where(fn ($q) => $q->ativos()->orWhereDate('created_at', today()))
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $contagens = [];
        foreach (StatusPedido::cases() as $caso) {
            $contagens[$caso->value] = (int) ($porStatus[$caso->value] ?? 0);
        }

        $contagens['ativos'] = array_sum(array_map(fn ($c) => $contagens[$c->value], StatusPedido::ativos()));

        return $contagens;
    }
}
