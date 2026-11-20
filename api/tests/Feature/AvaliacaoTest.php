<?php

namespace Tests\Feature;

use App\Enums\Papel;
use App\Enums\StatusPedido;
use App\Models\Pedido;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AvaliacaoTest extends TestCase
{
    use RefreshDatabase;

    private function pedido(): string
    {
        $produto = Produto::factory()->create();

        return $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'pix',
            'itens' => [['produto_id' => $produto->id, 'quantidade' => 1]],
        ])->assertCreated()->json('data.codigo');
    }

    public function test_cliente_avalia_depois_que_fica_pronto_e_so_uma_vez(): void
    {
        $codigo = $this->pedido();

        $this->postJson("/api/totem/pedidos/{$codigo}/avaliacao", ['nota' => 5])
            ->assertUnprocessable()->assertJsonValidationErrors('nota'); // ainda recebido

        Pedido::query()->where('codigo', $codigo)->update(['status' => StatusPedido::Pronto]);

        $this->postJson("/api/totem/pedidos/{$codigo}/avaliacao", ['nota' => 7])->assertUnprocessable();

        $this->postJson('/api/totem/pedidos/'.strtolower($codigo).'/avaliacao', ['nota' => 4, 'comentario' => '  Muito bom  '])
            ->assertOk()
            ->assertJsonPath('data.avaliacao', 4);

        $this->assertDatabaseHas('pedidos', ['codigo' => $codigo, 'avaliacao' => 4, 'avaliacao_comentario' => 'Muito bom']);

        $this->postJson("/api/totem/pedidos/{$codigo}/avaliacao", ['nota' => 1])->assertUnprocessable();
        $this->postJson('/api/totem/pedidos/Z999/avaliacao', ['nota' => 5])->assertNotFound();
    }

    public function test_painel_mostra_media_e_comentarios(): void
    {
        foreach ([[5, 'Ótimo'], [4, null], [3, 'Demorou']] as [$nota, $comentario]) {
            $codigo = $this->pedido();
            Pedido::query()->where('codigo', $codigo)->update(['status' => StatusPedido::Retirado]);
            $this->postJson("/api/totem/pedidos/{$codigo}/avaliacao", ['nota' => $nota, 'comentario' => $comentario])->assertOk();
        }

        $this->entrarComo(Papel::Leitura);

        $avaliacoes = $this->getJson('/api/dashboard')->assertOk()->json('data.avaliacoes');

        $this->assertEquals(4.0, $avaliacoes['media']);
        $this->assertSame(3, $avaliacoes['quantidade']);
        $this->assertCount(2, $avaliacoes['comentarios']);
        $this->assertSame(1, collect($avaliacoes['por_nota'])->firstWhere('nota', 5)['quantidade']);

        $pedidos = $this->getJson('/api/pedidos?status=todos')->json('data');
        $this->assertNotNull(collect($pedidos)->firstWhere('avaliacao.nota', 3));
    }
}
