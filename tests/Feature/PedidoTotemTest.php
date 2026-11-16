<?php

namespace Tests\Feature;

use App\Models\Produto;
use App\Models\Totem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoTotemTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Totem::query()->create(['codigo' => 'TOTEM-01', 'localizacao' => 'Entrada']);
    }

    public function test_cardapio_mostra_so_produtos_disponiveis(): void
    {
        $ativo = Produto::factory()->create(['nome' => 'Disponível']);
        Produto::factory()->create(['nome' => 'Inativo', 'ativo' => false, 'categoria_id' => $ativo->categoria_id]);
        Produto::factory()->create(['nome' => 'Esgotado', 'estoque' => 0, 'categoria_id' => $ativo->categoria_id]);

        $resposta = $this->getJson('/api/totem/cardapio')->assertOk();

        $nomes = collect($resposta->json('categorias'))->flatMap(fn ($c) => array_column($c['produtos'], 'nome'));
        $this->assertSame(['Disponível'], $nomes->all());
        $resposta->assertJsonPath('loja.nome_loja', 'GastroTech');
    }

    public function test_preco_vem_do_banco_e_estoque_e_baixado(): void
    {
        $lanche = Produto::factory()->create(['preco' => 20.00, 'estoque' => 5, 'tempo_preparo_min' => 12]);
        $bebida = Produto::factory()->create(['preco' => 6.50, 'estoque' => 5, 'tempo_preparo_min' => 2]);

        $resposta = $this->postJson('/api/totem/pedidos', [
            'nome_cliente' => 'Ana',
            'forma_pagamento' => 'pix',
            'itens' => [
                ['produto_id' => $lanche->id, 'quantidade' => 2, 'preco' => 0.01], // preço enviado é ignorado
                ['produto_id' => $bebida->id, 'quantidade' => 1],
            ],
        ]);

        $resposta->assertCreated()
            ->assertJsonPath('data.subtotal', 46.5)
            ->assertJsonPath('data.tempo_estimado_min', 12)
            ->assertJsonPath('data.status.valor', 'recebido')
            ->assertJsonPath('data.status_pagamento.valor', 'pago');

        $this->assertMatchesRegularExpression('/^A\d+$/', $resposta->json('data.codigo'));
        $this->assertSame(3, $lanche->fresh()->estoque);
        $this->assertSame(4, $bebida->fresh()->estoque);
    }

    public function test_pedido_em_dinheiro_fica_pendente(): void
    {
        $produto = Produto::factory()->create();

        $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'dinheiro',
            'itens' => [['produto_id' => $produto->id, 'quantidade' => 1]],
        ])->assertCreated()->assertJsonPath('data.status_pagamento.valor', 'pendente');
    }

    public function test_recusa_quando_nao_ha_estoque_somando_linhas_repetidas(): void
    {
        $produto = Produto::factory()->create(['estoque' => 3, 'nome' => 'Milkshake']);

        $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'pix',
            'itens' => [
                ['produto_id' => $produto->id, 'quantidade' => 2],
                ['produto_id' => $produto->id, 'quantidade' => 2],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors('itens.1.quantidade');

        $this->assertSame(3, $produto->fresh()->estoque);
        $this->assertDatabaseCount('pedidos', 0);
    }

    public function test_produto_inativo_nao_pode_ser_pedido(): void
    {
        $produto = Produto::factory()->create(['ativo' => false]);

        $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'pix',
            'itens' => [['produto_id' => $produto->id, 'quantidade' => 1]],
        ])->assertUnprocessable()->assertJsonValidationErrors('itens.0.produto_id');
    }

    public function test_personalizacao_obrigatoria_e_validada(): void
    {
        $bebida = Produto::factory()->comPersonalizacao()->create();

        // Falta o sabor (obrigatório)
        $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'pix',
            'itens' => [['produto_id' => $bebida->id, 'quantidade' => 1]],
        ])->assertUnprocessable()->assertJsonValidationErrors('itens.0.personalizacoes');

        // Opção que não existe
        $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'pix',
            'itens' => [['produto_id' => $bebida->id, 'quantidade' => 1, 'personalizacoes' => ['Sabor' => 'Cerveja']]],
        ])->assertUnprocessable()->assertJsonValidationErrors('itens.0.personalizacoes');

        // Correto (gelo é opcional)
        $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'pix',
            'itens' => [['produto_id' => $bebida->id, 'quantidade' => 1, 'personalizacoes' => ['Sabor' => 'Guaraná']]],
        ])->assertCreated()
            ->assertJsonPath('data.itens.0.personalizacoes.0.grupo', 'Sabor')
            ->assertJsonPath('data.itens.0.personalizacoes.0.opcao', 'Guaraná');
    }

    public function test_codigos_sao_unicos(): void
    {
        $produto = Produto::factory()->create(['estoque' => 10]);
        $codigos = [];

        for ($i = 0; $i < 3; $i++) {
            $codigos[] = $this->postJson('/api/totem/pedidos', [
                'forma_pagamento' => 'pix',
                'itens' => [['produto_id' => $produto->id, 'quantidade' => 1]],
            ])->json('data.codigo');
        }

        $this->assertCount(3, array_unique($codigos));
    }

    public function test_cliente_acompanha_pedido_pelo_codigo(): void
    {
        $produto = Produto::factory()->create();
        $codigo = $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'cartao',
            'itens' => [['produto_id' => $produto->id, 'quantidade' => 1]],
        ])->json('data.codigo');

        $this->getJson('/api/totem/pedidos/'.strtolower($codigo))
            ->assertOk()
            ->assertJsonPath('data.codigo', $codigo)
            ->assertJsonPath('data.etapas.0.concluida', true)
            ->assertJsonPath('data.etapas.1.concluida', false)
            ->assertJsonMissingPath('data.totem');

        $this->getJson('/api/totem/pedidos/Z999')->assertNotFound();
    }
}
