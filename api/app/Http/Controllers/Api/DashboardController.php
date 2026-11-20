<?php

namespace App\Http\Controllers\Api;

use App\Enums\StatusPedido;
use App\Http\Controllers\Controller;
use App\Http\Resources\InsumoResource;
use App\Http\Resources\PedidoResource;
use App\Models\Insumo;
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
                'operacao' => $this->operacao(),
                'avaliacoes' => $this->avaliacoes(),
                'atrasados' => PedidoResource::collection($atrasados->take(5)),
                'estoque_baixo' => [
                    'limite' => $limite,
                    'insumos' => InsumoResource::collection(Insumo::query()->acabando()->orderBy('nome')->limit(6)->get()),
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

    // nota média dos últimos 30 dias e os comentários mais novos
    private function avaliacoes(): array
    {
        $base = fn () => Pedido::query()->whereNotNull('avaliacao')->where('avaliado_em', '>=', today()->subDays(29));
        $quantidade = $base()->count();
        $porNota = $base()->selectRaw('avaliacao, COUNT(*) as total')->groupBy('avaliacao')->pluck('total', 'avaliacao');

        return [
            'media' => $quantidade ? round((float) $base()->avg('avaliacao'), 1) : null,
            'quantidade' => $quantidade,
            'por_nota' => collect(range(5, 1))->map(fn (int $n) => ['nota' => $n, 'quantidade' => (int) $porNota->get($n, 0)])->values(),
            'comentarios' => $base()
                ->whereNotNull('avaliacao_comentario')
                ->latest('avaliado_em')
                ->limit(4)
                ->get(['codigo', 'nome_cliente', 'avaliacao', 'avaliacao_comentario', 'avaliado_em'])
                ->map(fn (Pedido $p) => [
                    'codigo' => $p->codigo,
                    'nome_cliente' => $p->nome_cliente,
                    'nota' => $p->avaliacao,
                    'comentario' => $p->avaliacao_comentario,
                    'em' => $p->avaliado_em?->toIso8601String(),
                ]),
        ];
    }

    // horário de pico e tempo real de preparo dos últimos 7 dias.
    // conta no php pra não depender de função de data do banco (os testes rodam em sqlite)
    private function operacao(): array
    {
        $pedidos = Pedido::query()
            ->where('created_at', '>=', today()->subDays(6))
            ->where('status', '!=', StatusPedido::Cancelado)
            ->get(['created_at', 'pronto_em', 'tempo_estimado_min']);

        $porHora = $pedidos->countBy(fn (Pedido $p) => (int) $p->created_at->format('G'));
        $horas = $porHora->keys();
        $inicio = $horas->isEmpty() ? 11 : min($horas->min(), 11);
        $fim = $horas->isEmpty() ? 22 : max($horas->max(), 22);

        $preparados = $pedidos->filter(fn (Pedido $p) => $p->pronto_em !== null);
        $minutos = $preparados->map(fn (Pedido $p) => max(0, $p->created_at->diffInMinutes($p->pronto_em)));
        $noPrazo = $preparados->filter(fn (Pedido $p) => $p->created_at->diffInMinutes($p->pronto_em) <= $p->tempo_estimado_min);

        return [
            'por_hora' => collect(range($inicio, $fim))
                ->map(fn (int $h) => ['hora' => $h, 'pedidos' => $porHora->get($h, 0)])
                ->values(),
            'preparo' => [
                'pedidos' => $preparados->count(),
                'medio_min' => $preparados->isEmpty() ? null : (int) round($minutos->avg()),
                'previsto_min' => $preparados->isEmpty() ? null : (int) round($preparados->avg('tempo_estimado_min')),
                'no_prazo_pct' => $preparados->isEmpty() ? null : (int) round($noPrazo->count() / $preparados->count() * 100),
            ],
        ];
    }
}
