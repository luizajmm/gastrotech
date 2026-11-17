<?php

namespace Database\Seeders;

use App\Enums\FormaPagamento;
use App\Enums\StatusPagamento;
use App\Enums\StatusPedido;
use App\Enums\TipoMovimento;
use App\Models\Caixa;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\Totem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Histórico de vendas dos últimos 7 dias + fila atual da cozinha,
 * para o dashboard e o financeiro já abrirem com dados na apresentação.
 */
class PedidosDemonstracaoSeeder extends Seeder
{
    private const CLIENTES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabi', 'Heitor', 'Iara', 'João', 'Larissa', 'Marcos'];

    public function run(): void
    {
        mt_srand(2026);

        $produtos = Produto::all();
        $totens = Totem::all();
        $admin = User::query()->where('email', 'admin@gastrotech.com')->first();

        // vendas dos últimos 7 dias
        for ($dia = 7; $dia >= 1; $dia--) {
            $quantidade = mt_rand(9, 18);

            for ($i = 0; $i < $quantidade; $i++) {
                $quando = now()->subDays($dia)->setTime(mt_rand(11, 21), mt_rand(0, 59));
                $this->criarPedido($produtos, $totens->random(), $quando, StatusPedido::Retirado);
            }
        }

        // caixa de hoje
        $caixa = Caixa::query()->create([
            'saldo_inicial' => 150,
            'status' => 'aberto',
            'aberto_por' => $admin?->id,
            'aberto_em' => now()->startOfDay()->addHours(10),
        ]);

        $caixa->movimentos()->createMany([
            ['tipo' => TipoMovimento::Entrada, 'descricao' => 'Reforço de troco', 'forma_pagamento' => FormaPagamento::Dinheiro, 'valor' => 50, 'user_id' => $admin?->id],
            ['tipo' => TipoMovimento::Saida, 'descricao' => 'Compra de embalagens', 'forma_pagamento' => FormaPagamento::Dinheiro, 'valor' => 22.50, 'user_id' => $admin?->id],
        ]);

        // pedidos de hoje já retirados
        for ($i = 0; $i < 6; $i++) {
            $this->criarPedido($produtos, $totens->random(), now()->subMinutes(mt_rand(90, 240)), StatusPedido::Retirado);
        }

        // fila da cozinha (um atrasado de propósito)
        $this->criarPedido($produtos, $totens->first(), now()->subMinutes(32), StatusPedido::EmPreparo);
        $this->criarPedido($produtos, $totens->first(), now()->subMinutes(12), StatusPedido::EmPreparo);
        $this->criarPedido($produtos, $totens->last(), now()->subMinutes(6), StatusPedido::Pronto);
        $this->criarPedido($produtos, $totens->first(), now()->subMinutes(3), StatusPedido::Recebido);
        $this->criarPedido($produtos, $totens->last(), now()->subMinute(), StatusPedido::Recebido, FormaPagamento::Dinheiro);
    }

    private function criarPedido($produtos, Totem $totem, Carbon $quando, StatusPedido $status, ?FormaPagamento $forma = null): void
    {
        $forma ??= collect(FormaPagamento::cases())->random();
        $pago = $forma->pagoNoTotem() || $status === StatusPedido::Retirado;
        $escolhidos = $produtos->random(mt_rand(1, 3));

        $pedido = Pedido::query()->create([
            'totem_id' => $totem->id,
            'nome_cliente' => self::CLIENTES[array_rand(self::CLIENTES)],
            'status' => $status,
            'status_pagamento' => $pago ? StatusPagamento::Pago : StatusPagamento::Pendente,
            'forma_pagamento' => $forma,
            'subtotal' => 0,
            'tempo_estimado_min' => (int) $escolhidos->max('tempo_preparo_min'),
            'pago_em' => $pago ? $quando : null,
            'pronto_em' => in_array($status, [StatusPedido::Pronto, StatusPedido::Retirado], true) ? $quando->copy()->addMinutes(15) : null,
            'finalizado_em' => $status === StatusPedido::Retirado ? $quando->copy()->addMinutes(20) : null,
        ]);

        $subtotal = 0;

        foreach ($escolhidos as $produto) {
            $quantidade = mt_rand(1, 2);
            $escolhas = [];

            foreach ($produto->gruposPersonalizacao() as $grupo) {
                $escolhas[$grupo['nome']] = $grupo['opcoes'][array_rand($grupo['opcoes'])];
            }

            $pedido->itens()->create([
                'produto_id' => $produto->id,
                'nome_produto' => $produto->nome,
                'personalizacoes' => $escolhas ?: null,
                'quantidade' => $quantidade,
                'preco_unitario' => $produto->preco,
            ]);

            $subtotal += (float) $produto->preco * $quantidade;
        }

        $pedido->forceFill([
            'codigo' => Pedido::gerarCodigo($pedido->id),
            'subtotal' => $subtotal,
            'created_at' => $quando,
            'updated_at' => $quando,
        ])->save();
    }
}
