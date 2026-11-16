<?php

namespace Tests\Feature;

use App\Enums\Papel;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceiroTest extends TestCase
{
    use RefreshDatabase;

    private function vender(string $forma, float $preco): void
    {
        $produto = Produto::factory()->create(['preco' => $preco]);

        $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => $forma,
            'itens' => [['produto_id' => $produto->id, 'quantidade' => 1]],
        ])->assertCreated();
    }

    public function test_fluxo_do_caixa(): void
    {
        $this->entrarComo(Papel::Atendimento);

        $this->postJson('/api/financeiro/movimentos', ['tipo' => 'saida', 'descricao' => 'Gelo', 'valor' => 10])
            ->assertUnprocessable()->assertJsonValidationErrors('caixa');

        $this->postJson('/api/financeiro/caixa/abrir', ['saldo_inicial' => 100])->assertCreated();
        $this->postJson('/api/financeiro/caixa/abrir', ['saldo_inicial' => 100])->assertUnprocessable();

        $this->postJson('/api/financeiro/movimentos', ['tipo' => 'entrada', 'descricao' => 'Troco', 'valor' => 50])->assertCreated();
        $this->postJson('/api/financeiro/movimentos', ['tipo' => 'saida', 'descricao' => 'Gelo', 'valor' => 20])->assertCreated();

        $this->travel(1)->seconds();
        $this->vender('pix', 30);       // não entra na gaveta
        $this->vender('dinheiro', 15);  // pendente: ainda não entra

        $this->getJson('/api/financeiro/caixa')
            ->assertOk()
            ->assertJsonPath('data.resumo.vendas_dinheiro', 0.0)
            ->assertJsonPath('data.resumo.saldo_esperado', 130.0);

        $id = \App\Models\Pedido::query()->where('forma_pagamento', 'dinheiro')->value('id');
        $this->postJson("/api/pedidos/$id/pagamento")->assertOk();

        $this->getJson('/api/financeiro/caixa')->assertJsonPath('data.resumo.saldo_esperado', 145.0);

        $this->postJson('/api/financeiro/caixa/fechar')
            ->assertOk()
            ->assertJsonPath('data.caixa.status.valor', 'fechado')
            ->assertJsonPath('data.caixa.saldo_final', 145.0);
    }

    public function test_relatorio_de_vendas_por_forma(): void
    {
        $this->vender('pix', 30);
        $this->vender('cartao', 20);
        $this->vender('dinheiro', 99); // pendente: fora do relatório

        $this->entrarComo(Papel::Leitura);

        $resposta = $this->getJson('/api/financeiro/vendas')->assertOk();
        $resposta->assertJsonPath('data.total', 50.0)
            ->assertJsonPath('data.quantidade_pedidos', 2)
            ->assertJsonPath('data.ticket_medio', 25.0);

        $this->assertCount(7, $resposta->json('data.por_dia'));

        $this->getJson('/api/financeiro/vendas?forma_pagamento=pix')->assertJsonPath('data.total', 30.0);
        $this->getJson('/api/financeiro/vendas?data_inicio=2026-02-10&data_fim=2026-02-01')->assertUnprocessable();
    }
}
