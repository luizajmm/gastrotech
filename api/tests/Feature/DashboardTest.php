<?php

namespace Tests\Feature;

use App\Enums\FormaPagamento;
use App\Enums\Papel;
use App\Enums\StatusPedido;
use App\Models\Pedido;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function pedido(Carbon $quando, ?int $preparoMin, int $previstoMin = 10, StatusPedido $status = StatusPedido::Pronto): void
    {
        $pedido = Pedido::query()->create([
            'status' => $status,
            'forma_pagamento' => FormaPagamento::Pix,
            'tempo_estimado_min' => $previstoMin,
            'pronto_em' => $preparoMin === null ? null : $quando->copy()->addMinutes($preparoMin),
        ]);
        $pedido->forceFill(['created_at' => $quando])->save();
    }

    public function test_mostra_horario_de_pico_e_tempo_de_preparo(): void
    {
        $this->travelTo(today()->setTime(20, 0));
        $this->entrarComo(Papel::Administrador);

        $this->pedido(today()->setTime(12, 10), 8);
        $this->pedido(today()->setTime(12, 40), 14);
        $this->pedido(today()->subDay()->setTime(12, 5), 11);
        $this->pedido(today()->setTime(19, 30), null, 10, StatusPedido::Recebido);
        $this->pedido(today()->setTime(13, 0), 30, 10, StatusPedido::Cancelado); // cancelado não conta
        $this->pedido(today()->subDays(10)->setTime(12, 0), 50); // fora da semana

        $operacao = $this->getJson('/api/dashboard')->assertOk()->json('data.operacao');

        $porHora = collect($operacao['por_hora'])->pluck('pedidos', 'hora');
        $this->assertSame(3, $porHora[12]);
        $this->assertSame(0, $porHora[13]);
        $this->assertSame(1, $porHora[19]);

        // (8 + 14 + 11) / 3 = 11 min, e só o de 8 min ficou dentro dos 10 previstos
        $this->assertSame(3, $operacao['preparo']['pedidos']);
        $this->assertSame(11, $operacao['preparo']['medio_min']);
        $this->assertSame(10, $operacao['preparo']['previsto_min']);
        $this->assertSame(33, $operacao['preparo']['no_prazo_pct']);
    }

    public function test_sem_pedidos_nao_quebra(): void
    {
        $this->entrarComo(Papel::Administrador);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.operacao.preparo.medio_min', null)
            ->assertJsonCount(12, 'data.operacao.por_hora');
    }
}
