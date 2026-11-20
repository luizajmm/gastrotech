<?php

namespace App\Services;

use App\Enums\FormaPagamento;
use App\Enums\StatusCaixa;
use App\Enums\StatusPagamento;
use App\Enums\TipoMovimento;
use App\Models\Caixa;
use App\Models\ItemPedido;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FinanceiroService
{
    public function vendas(Carbon $inicio, Carbon $fim, ?FormaPagamento $forma = null): array
    {
        $base = fn () => $this->pedidosPagos($inicio, $fim, $forma);

        $total = (float) $base()->sum('total');
        $quantidade = $base()->count();

        $porForma = $base()
            ->select('forma_pagamento', DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as quantidade'))
            ->groupBy('forma_pagamento')
            ->get()
            ->keyBy(fn ($linha) => $linha->forma_pagamento->value);

        $porDia = $base()
            ->select(DB::raw('DATE(pago_em) as dia'), DB::raw('SUM(total) as total'), DB::raw('COUNT(*) as quantidade'))
            ->groupBy(DB::raw('DATE(pago_em)'))
            ->get()
            ->keyBy('dia');

        $dias = [];
        for ($dia = $inicio->copy()->startOfDay(); $dia->lte($fim); $dia->addDay()) {
            $linha = $porDia->get($dia->toDateString());
            $dias[] = [
                'data' => $dia->toDateString(),
                'total' => round((float) ($linha->total ?? 0), 2),
                'quantidade' => (int) ($linha->quantidade ?? 0),
            ];
        }

        return [
            'periodo' => ['inicio' => $inicio->toDateString(), 'fim' => $fim->toDateString()],
            'total' => round($total, 2),
            'quantidade_pedidos' => $quantidade,
            'ticket_medio' => $quantidade ? round($total / $quantidade, 2) : 0,
            'por_forma' => collect(FormaPagamento::cases())->map(fn (FormaPagamento $f) => [
                'valor' => $f->value,
                'rotulo' => $f->rotulo(),
                'total' => round((float) ($porForma->get($f->value)->total ?? 0), 2),
                'quantidade' => (int) ($porForma->get($f->value)->quantidade ?? 0),
            ])->values(),
            'por_dia' => $dias,
            'mais_vendidos' => $this->maisVendidos($inicio, $fim, $forma),
        ];
    }

    // saldo inicial + vendas em dinheiro + entradas - saídas
    public function resumoCaixa(Caixa $caixa): array
    {
        $ate = $caixa->fechado_em ?? now();

        $vendasDinheiro = (float) Pedido::query()
            ->where('status_pagamento', StatusPagamento::Pago)
            ->where('forma_pagamento', FormaPagamento::Dinheiro)
            ->whereBetween('pago_em', [$caixa->aberto_em, $ate])
            ->sum('total');

        $entradas = (float) $caixa->movimentos()->where('tipo', TipoMovimento::Entrada)->sum('valor');
        $saidas = (float) $caixa->movimentos()->where('tipo', TipoMovimento::Saida)->sum('valor');

        return [
            'saldo_inicial' => (float) $caixa->saldo_inicial,
            'vendas_dinheiro' => round($vendasDinheiro, 2),
            'entradas' => round($entradas, 2),
            'saidas' => round($saidas, 2),
            'saldo_esperado' => round((float) $caixa->saldo_inicial + $vendasDinheiro + $entradas - $saidas, 2),
        ];
    }

    public function abrirCaixa(float $saldoInicial, User $usuario): Caixa
    {
        if (Caixa::aberto()) {
            throw ValidationException::withMessages(['caixa' => 'Já existe um caixa aberto. Feche-o antes de abrir outro.']);
        }

        return Caixa::query()->create([
            'saldo_inicial' => $saldoInicial,
            'status' => StatusCaixa::Aberto,
            'aberto_por' => $usuario->id,
            'aberto_em' => now(),
        ]);
    }

    public function fecharCaixa(User $usuario): Caixa
    {
        $caixa = Caixa::aberto();

        if (! $caixa) {
            throw ValidationException::withMessages(['caixa' => 'Não há caixa aberto.']);
        }

        $resumo = $this->resumoCaixa($caixa);

        $caixa->update([
            'status' => StatusCaixa::Fechado,
            'saldo_final' => $resumo['saldo_esperado'],
            'fechado_por' => $usuario->id,
            'fechado_em' => now(),
        ]);

        return $caixa;
    }

    // lista pra planilha do contador
    public function pedidosDoPeriodo(Carbon $inicio, Carbon $fim, ?FormaPagamento $forma = null): Collection
    {
        return $this->pedidosPagos($inicio, $fim, $forma)
            ->with('itens')
            ->orderBy('pago_em')
            ->limit(5000)
            ->get();
    }

    private function pedidosPagos(Carbon $inicio, Carbon $fim, ?FormaPagamento $forma): Builder
    {
        return Pedido::query()
            ->where('status_pagamento', StatusPagamento::Pago)
            ->whereBetween('pago_em', [$inicio->copy()->startOfDay(), $fim->copy()->endOfDay()])
            ->when($forma, fn (Builder $q) => $q->where('forma_pagamento', $forma));
    }

    private function maisVendidos(Carbon $inicio, Carbon $fim, ?FormaPagamento $forma, int $limite = 5): array
    {
        return ItemPedido::query()
            ->join('pedidos', 'pedidos.id', '=', 'itens_pedido.pedido_id')
            ->where('pedidos.status_pagamento', StatusPagamento::Pago->value)
            ->whereBetween('pedidos.pago_em', [$inicio->copy()->startOfDay(), $fim->copy()->endOfDay()])
            ->when($forma, fn ($q) => $q->where('pedidos.forma_pagamento', $forma->value))
            ->select(
                'itens_pedido.nome_produto as nome',
                DB::raw('SUM(itens_pedido.quantidade) as quantidade'),
                DB::raw('SUM(itens_pedido.quantidade * itens_pedido.preco_unitario) as total'),
            )
            ->groupBy('itens_pedido.nome_produto')
            ->orderByDesc('quantidade')
            ->limit($limite)
            ->get()
            ->map(fn ($linha) => [
                'nome' => $linha->nome,
                'quantidade' => (int) $linha->quantidade,
                'total' => round((float) $linha->total, 2),
            ])
            ->all();
    }
}
