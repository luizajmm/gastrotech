<?php

namespace Tests\Feature;

use App\Enums\Papel;
use App\Models\Cupom;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CupomTest extends TestCase
{
    use RefreshDatabase;

    private function pedir(Produto $produto, ?string $cupom, int $quantidade = 1)
    {
        return $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'pix',
            'cupom' => $cupom,
            'itens' => [['produto_id' => $produto->id, 'quantidade' => $quantidade]],
        ]);
    }

    public function test_desconto_em_porcentagem_e_contado_no_financeiro(): void
    {
        Cupom::query()->create(['codigo' => 'DEZ', 'tipo' => 'percentual', 'valor' => 10]);
        $lanche = Produto::factory()->create(['preco' => 25]);

        $this->pedir($lanche, ' dez ', 2) // minúsculo e com espaço também vale
            ->assertCreated()
            ->assertJsonPath('data.subtotal', 50)
            ->assertJsonPath('data.desconto', 5)
            ->assertJsonPath('data.total', 45)
            ->assertJsonPath('data.cupom', 'DEZ');

        $this->assertSame(1, Cupom::query()->first()->usos);

        $this->entrarComo(Papel::Leitura);
        $this->getJson('/api/financeiro/vendas')->assertJsonPath('data.total', 45);
    }

    public function test_valor_fixo_respeita_minimo_e_nunca_passa_do_pedido(): void
    {
        Cupom::query()->create(['codigo' => 'CINCO', 'tipo' => 'valor', 'valor' => 5, 'pedido_minimo' => 30]);
        Cupom::query()->create(['codigo' => 'GRANDE', 'tipo' => 'valor', 'valor' => 100]);
        $barato = Produto::factory()->create(['preco' => 12]);

        $this->pedir($barato, 'CINCO')->assertUnprocessable()->assertJsonValidationErrors('cupom');
        $this->pedir($barato, 'GRANDE')->assertCreated()->assertJsonPath('data.total', 0);
    }

    public function test_cupom_vencido_inativo_ou_esgotado_e_recusado(): void
    {
        $produto = Produto::factory()->create(['preco' => 40]);
        Cupom::query()->create(['codigo' => 'VELHO', 'tipo' => 'valor', 'valor' => 5, 'validade' => now()->subDay()->toDateString()]);
        Cupom::query()->create(['codigo' => 'PAUSADO', 'tipo' => 'valor', 'valor' => 5, 'ativo' => false]);
        Cupom::query()->create(['codigo' => 'UMAVEZ', 'tipo' => 'valor', 'valor' => 5, 'limite_usos' => 1]);

        $this->pedir($produto, 'VELHO')->assertUnprocessable();
        $this->pedir($produto, 'PAUSADO')->assertUnprocessable();
        $this->pedir($produto, 'NAOEXISTE')->assertUnprocessable();

        $this->pedir($produto, 'UMAVEZ')->assertCreated();
        $estoque = $produto->fresh()->estoque;
        $this->pedir($produto, 'UMAVEZ')->assertUnprocessable();
        $this->assertSame($estoque, $produto->fresh()->estoque); // pedido recusado não baixa estoque
    }

    public function test_cancelar_devolve_o_uso(): void
    {
        $cupom = Cupom::query()->create(['codigo' => 'UMAVEZ', 'tipo' => 'valor', 'valor' => 5, 'limite_usos' => 1]);
        $produto = Produto::factory()->create(['preco' => 40]);
        $codigo = $this->pedir($produto, 'UMAVEZ')->assertCreated()->json('data.codigo');

        $this->entrarComo(Papel::Atendimento);
        $pedido = collect($this->getJson('/api/pedidos')->json('data'))->firstWhere('codigo', $codigo);
        $this->postJson("/api/pedidos/{$pedido['id']}/cancelar")->assertOk();

        $this->assertSame(0, $cupom->fresh()->usos);
    }

    public function test_totem_confere_cupom_antes_de_pagar(): void
    {
        Cupom::query()->create(['codigo' => 'DEZ', 'tipo' => 'percentual', 'valor' => 10, 'descricao' => '10% off']);

        $this->getJson('/api/totem/cupons/dez?subtotal=32.90')
            ->assertOk()
            ->assertJsonPath('data.codigo', 'DEZ')
            ->assertJsonPath('data.desconto', 3.29);

        $this->getJson('/api/totem/cupons/nada?subtotal=10')->assertUnprocessable();
    }

    public function test_cadastro_de_cupons_no_painel(): void
    {
        $this->entrarComo(Papel::Cardapio);

        $this->postJson('/api/cupons', ['codigo' => 'promo 1', 'tipo' => 'percentual', 'valor' => 10])
            ->assertUnprocessable()->assertJsonValidationErrors('codigo');
        $this->postJson('/api/cupons', ['codigo' => 'promo', 'tipo' => 'percentual', 'valor' => 150])
            ->assertUnprocessable()->assertJsonValidationErrors('valor');

        $id = $this->postJson('/api/cupons', ['codigo' => 'promo', 'tipo' => 'percentual', 'valor' => 15])
            ->assertCreated()
            ->assertJsonPath('data.codigo', 'PROMO')
            ->json('data.id');

        $this->postJson('/api/cupons', ['codigo' => 'PROMO', 'tipo' => 'valor', 'valor' => 5])
            ->assertUnprocessable()->assertJsonValidationErrors('codigo');

        $this->putJson("/api/cupons/{$id}", ['ativo' => false])->assertOk()->assertJsonPath('data.ativo', false);
        $this->deleteJson("/api/cupons/{$id}")->assertOk();
        $this->assertDatabaseMissing('cupons', ['id' => $id]);

        $this->entrarComo(Papel::Atendimento);
        $this->postJson('/api/cupons', ['codigo' => 'X10', 'tipo' => 'valor', 'valor' => 10])->assertForbidden();
    }
}
