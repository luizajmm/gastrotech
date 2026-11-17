<?php

namespace Tests\Feature;

use App\Enums\Papel;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CozinhaTest extends TestCase
{
    use RefreshDatabase;

    private function novoPedido(string $forma = 'pix', ?Produto $produto = null, int $quantidade = 1): array
    {
        $produto ??= Produto::factory()->create();

        return $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => $forma,
            'itens' => [['produto_id' => $produto->id, 'quantidade' => $quantidade]],
        ])->assertCreated()->json('data');
    }

    private function idDoPedido(string $codigo): int
    {
        return \App\Models\Pedido::query()->where('codigo', $codigo)->value('id');
    }

    public function test_pedido_percorre_o_fluxo_da_cozinha(): void
    {
        $id = $this->idDoPedido($this->novoPedido()['codigo']);
        $this->entrarComo(Papel::Atendimento);

        $this->postJson("/api/pedidos/$id/avancar")->assertOk()->assertJsonPath('data.status.valor', 'em_preparo');
        $this->postJson("/api/pedidos/$id/avancar")->assertOk()->assertJsonPath('data.status.valor', 'pronto');
        $this->postJson("/api/pedidos/$id/avancar")->assertOk()->assertJsonPath('data.status.valor', 'retirado');
        $this->postJson("/api/pedidos/$id/avancar")->assertUnprocessable();
    }

    public function test_nao_entrega_pedido_sem_pagamento(): void
    {
        $id = $this->idDoPedido($this->novoPedido('dinheiro')['codigo']);
        $this->entrarComo(Papel::Atendimento);

        $this->postJson("/api/pedidos/$id/avancar");
        $this->postJson("/api/pedidos/$id/avancar");
        $this->postJson("/api/pedidos/$id/avancar")->assertUnprocessable()->assertJsonValidationErrors('status');

        $this->postJson("/api/pedidos/$id/pagamento")->assertOk()->assertJsonPath('data.status_pagamento.valor', 'pago');
        $this->postJson("/api/pedidos/$id/avancar")->assertOk()->assertJsonPath('data.status.valor', 'retirado');
    }

    public function test_cancelar_devolve_estoque_e_estorna(): void
    {
        $produto = Produto::factory()->create(['estoque' => 5]);
        $id = $this->idDoPedido($this->novoPedido('pix', $produto, 2)['codigo']);
        $this->assertSame(3, $produto->fresh()->estoque);

        $this->entrarComo(Papel::Atendimento);
        $this->postJson("/api/pedidos/$id/cancelar")
            ->assertOk()
            ->assertJsonPath('data.status.valor', 'cancelado')
            ->assertJsonPath('data.status_pagamento.valor', 'estornado');

        $this->assertSame(5, $produto->fresh()->estoque);
        $this->postJson("/api/pedidos/$id/cancelar")->assertUnprocessable();
    }

    public function test_fila_lista_pedidos_ativos_com_contagens(): void
    {
        $this->novoPedido();
        $this->novoPedido();
        $this->entrarComo(Papel::Leitura);

        $this->getJson('/api/pedidos')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('contagens.recebido', 2)
            ->assertJsonPath('contagens.ativos', 2);
    }

    public function test_somente_leitura_nao_mexe_na_fila(): void
    {
        $id = $this->idDoPedido($this->novoPedido()['codigo']);
        $this->entrarComo(Papel::Leitura);

        $this->postJson("/api/pedidos/$id/avancar")->assertForbidden();
        $this->postJson("/api/pedidos/$id/cancelar")->assertForbidden();
    }
}
