<?php

namespace Tests\Feature;

use App\Enums\Papel;
use App\Models\Insumo;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FichaTecnicaTest extends TestCase
{
    use RefreshDatabase;

    private Insumo $pao;

    private Insumo $carne;

    private Produto $lanche;

    protected function setUp(): void
    {
        parent::setUp();

        $this->pao = Insumo::query()->create(['nome' => 'Pão', 'unidade' => 'un', 'estoque' => 3, 'estoque_minimo' => 2]);
        $this->carne = Insumo::query()->create(['nome' => 'Carne', 'unidade' => 'g', 'estoque' => 1000, 'estoque_minimo' => 200]);
        $this->lanche = Produto::factory()->create(['nome' => 'Smash', 'estoque' => 50, 'preco' => 20]);
        $this->lanche->insumos()->sync([$this->pao->id => ['quantidade' => 1], $this->carne->id => ['quantidade' => 180]]);
    }

    private function pedir(int $quantidade)
    {
        return $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'pix',
            'itens' => [['produto_id' => $this->lanche->id, 'quantidade' => $quantidade]],
        ]);
    }

    public function test_pedido_baixa_os_insumos_e_cancelar_devolve(): void
    {
        $codigo = $this->pedir(2)->assertCreated()->json('data.codigo');

        $this->assertEquals(1, (float) $this->pao->fresh()->estoque);
        $this->assertEquals(640, (float) $this->carne->fresh()->estoque);

        $this->entrarComo(Papel::Atendimento);
        $pedido = collect($this->getJson('/api/pedidos')->json('data'))->firstWhere('codigo', $codigo);
        $this->postJson("/api/pedidos/{$pedido['id']}/cancelar")->assertOk();

        $this->assertEquals(3, (float) $this->pao->fresh()->estoque);
        $this->assertEquals(1000, (float) $this->carne->fresh()->estoque);
    }

    public function test_falta_de_insumo_recusa_o_pedido_e_esconde_do_totem(): void
    {
        // a carne rende 5 lanches, o pão só 3
        $this->pedir(4)->assertUnprocessable()->assertJsonFragment(['Smash acabou por agora (faltou Pão).']);
        $this->assertEquals(3, (float) $this->pao->fresh()->estoque);

        $produtos = collect($this->getJson('/api/totem/cardapio')->json('categorias'))->flatMap(fn ($c) => $c['produtos']);
        $this->assertSame(3, $produtos->firstWhere('nome', 'Smash')['estoque']);
        $this->assertArrayNotHasKey('ficha', $produtos->firstWhere('nome', 'Smash')); // a ficha não vai pro cliente

        $this->pao->update(['estoque' => 0]);
        $nomes = collect($this->getJson('/api/totem/cardapio')->json('categorias'))->flatMap(fn ($c) => array_column($c['produtos'], 'nome'));
        $this->assertNotContains('Smash', $nomes->all());
    }

    public function test_painel_cadastra_insumo_monta_ficha_e_avisa_estoque_baixo(): void
    {
        $this->entrarComo(Papel::Cardapio);

        $queijo = $this->postJson('/api/insumos', ['nome' => 'Queijo', 'unidade' => 'un', 'estoque' => 10, 'estoque_minimo' => 12])
            ->assertCreated()->assertJsonPath('data.acabando', true)->json('data.id');
        $this->postJson('/api/insumos', ['nome' => 'Queijo', 'unidade' => 'un'])->assertUnprocessable()->assertJsonValidationErrors('nome');
        $this->postJson('/api/insumos', ['nome' => 'Sal', 'unidade' => 'pitada'])->assertUnprocessable()->assertJsonValidationErrors('unidade');

        $this->postJson("/api/insumos/{$queijo}/entrada", ['quantidade' => 5])->assertOk()->assertJsonPath('data.estoque', 15);

        $this->putJson("/api/produtos/{$this->lanche->id}", ['ficha' => [
            ['insumo_id' => $this->pao->id, 'quantidade' => 1],
            ['insumo_id' => $queijo, 'quantidade' => 2],
        ]])->assertOk()->assertJsonCount(2, 'data.ficha')->assertJsonPath('data.disponivel', 3);

        // editar sem mandar a ficha não apaga a ficha
        $this->putJson("/api/produtos/{$this->lanche->id}", ['ativo' => true])->assertOk()->assertJsonCount(2, 'data.ficha');

        $this->putJson("/api/produtos/{$this->lanche->id}", ['ficha' => [
            ['insumo_id' => $this->pao->id, 'quantidade' => 1],
            ['insumo_id' => $this->pao->id, 'quantidade' => 2],
        ]])->assertUnprocessable();

        $this->deleteJson("/api/insumos/{$queijo}")->assertUnprocessable(); // está numa ficha

        $this->pao->update(['estoque' => 2]); // chegou no mínimo
        $this->getJson('/api/dashboard')->assertOk()
            ->assertJsonPath('data.estoque_baixo.insumos.0.nome', 'Pão')
            ->assertJsonCount(1, 'data.estoque_baixo.insumos');
    }
}
