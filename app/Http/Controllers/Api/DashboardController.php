<?php

namespace App\Http\Controllers\Api;

use App\Enums\StatusPedido;
use App\Http\Controllers\Controller;
use App\Http\Resources\PedidoResource;
use App\Http\Resources\ProdutoResource;
use App\Models\Configuracao;
use App\Models\Pedido;
use App\Models\Produto;
use App\Services\FinanceiroService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __invoke(FinanceiroService $financeiro): JsonResponse
    {
        $hoje = $financeiro->vendas(today(), today()->endOfDay());
        $semana = $financeiro->vendas(today()->subDays(6), today()->endOfDay());

        $fila = Pedido::query()->ativos()->with(['itens', 'totem'])->oldest()->get();
        $atrasados = $fila->filter(fn (Pedido $p) => $p->minutosAtraso() > 0)
            ->sortByDesc(fn (Pedido $p) => $p->minutosAtraso())
            ->values();

        $limite = Configuracao::inteiro('estoque_baixo');

        return response()->json([
            'data' => [
                'hoje' => [
                    'faturamento' => $hoje['total'],
                    'pedidos' => Pedido::query()->whereDate('created_at', today())->where('status', '!=', StatusPedido::Cancelado)->count(),
                    'ticket_medio' => $hoje['ticket_medio'],
                    'por_forma' => $hoje['por_forma'],
                ],
                'fila' => [
                    'total' => $fila->count(),
                    'recebidos' => $fila->where('status', StatusPedido::Recebido)->count(),
                    'em_preparo' => $fila->where('status', StatusPedido::EmPreparo)->count(),
                    'prontos' => $fila->where('status', StatusPedido::Pronto)->count(),
                ],
                'semana' => [
                    'total' => $semana['total'],
                    'por_dia' => $semana['por_dia'],
                    'mais_vendidos' => $semana['mais_vendidos'],
                ],
                'atrasados' => PedidoResource::collection($atrasados->take(5)),
                'estoque_baixo' => [
                    'limite' => $limite,
                    'produtos' => ProdutoResource::collection(
                        Produto::query()->with('categoria')->estoqueBaixo($limite)->orderBy('estoque')->limit(6)->get()
                    ),
                ],
                'recentes' => PedidoResource::collection(
                    Pedido::query()->with(['itens', 'totem'])->latest()->limit(6)->get()
                ),
            ],
        ]);
    }
}
