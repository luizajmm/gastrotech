<?php

namespace Tests\Feature;

use App\Enums\Papel;
use App\Models\Cliente;
use App\Models\Configuracao;
use App\Models\Cupom;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FidelidadeTest extends TestCase
{
    use RefreshDatabase;

    private Produto $lanche;

    protected function setUp(): void
    {
        parent::setUp();
        Configuracao::definir('fidelidade_meta', '3');
        Configuracao::definir('fidelidade_premio', '10');
        $this->lanche = Produto::factory()->create(['preco' => 25, 'estoque' => 50]);
    }

    private function pedir(array $extra = [])
    {
        return $this->postJson('/api/totem/pedidos', [
            'forma_pagamento' => 'pix',
            'itens' => [['produto_id' => $this->lanche->id, 'quantidade' => 1]],
            ...$extra,
        ]);
    }

    public function test_cada_pedido_ganha_um_selo_e_o_premio_desconta(): void
    {
        $this->getJson('/api/totem/fidelidade/(11) 98765-4321')
            ->assertOk()
            ->assertJsonPath('data.selos', 0)
            ->assertJsonPath('data.meta', 3);

        foreach (range(1, 3) as $i) {
            $this->pedir(['telefone' => '(11) 98765-4321'])->assertCreated()->assertJsonPath('data.fidelidade.selos', $i);
        }

        $this->getJson('/api/totem/fidelidade/11987654321')->assertJsonPath('data.pode_resgatar', true);

        $this->pedir(['telefone' => '11987654321', 'resgatar_premio' => true])
            ->assertCreated()
            ->assertJsonPath('data.desconto', 10)
            ->assertJsonPath('data.total', 15)
            ->assertJsonPath('data.fidelidade.resgate', true)
            ->assertJsonPath('data.fidelidade.selos', 0); // o pedido do prêmio não ganha selo

        $cliente = Cliente::query()->first();
        $this->assertSame(1, $cliente->resgates);

        // sem selos suficientes não dá pra resgatar de novo
        $this->pedir(['telefone' => '11987654321', 'resgatar_premio' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('telefone');
    }

    public function test_cancelar_devolve_o_selo_e_o_premio(): void
    {
        Cliente::query()->create(['telefone' => '11900000001', 'selos' => 3]);

        $premio = $this->pedir(['telefone' => '11900000001', 'resgatar_premio' => true])->assertCreated()->json('data.codigo');
        $normal = $this->pedir(['telefone' => '11900000001'])->assertCreated()->json('data.codigo');
        $this->assertSame(1, Cliente::query()->first()->selos);

        $this->entrarComo(Papel::Atendimento);
        $pedidos = collect($this->getJson('/api/pedidos')->json('data'))->keyBy('codigo');
        $this->postJson("/api/pedidos/{$pedidos[$normal]['id']}/cancelar")->assertOk();
        $this->postJson("/api/pedidos/{$pedidos[$premio]['id']}/cancelar")->assertOk();

        $cliente = Cliente::query()->first();
        $this->assertSame(3, $cliente->selos);
        $this->assertSame(0, $cliente->resgates);
    }

    public function test_celular_invalido_cupom_junto_e_cartao_desligado(): void
    {
        $this->getJson('/api/totem/fidelidade/1234')->assertUnprocessable()->assertJsonValidationErrors('telefone');
        $this->pedir(['telefone' => '999'])->assertUnprocessable();

        Cupom::query()->create(['codigo' => 'DEZ', 'tipo' => 'percentual', 'valor' => 10]);
        Cliente::query()->create(['telefone' => '11900000001', 'selos' => 3]);
        $this->pedir(['telefone' => '11900000001', 'resgatar_premio' => true, 'cupom' => 'DEZ'])
            ->assertUnprocessable()->assertJsonValidationErrors('cupom');

        // desligado no painel: o celular é ignorado
        Configuracao::definir('fidelidade_ativa', '0');
        $this->pedir(['telefone' => '11900000002'])->assertCreated()->assertJsonPath('data.fidelidade', null);
        $this->assertDatabaseMissing('clientes', ['telefone' => '11900000002']);
    }

    public function test_painel_lista_clientes_com_celular_mascarado_e_configura_regras(): void
    {
        $this->pedir(['telefone' => '11987654321'])->assertCreated();

        $this->entrarComo(Papel::Leitura);
        $this->getJson('/api/clientes')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.clientes.0.telefone', '(11) •••••-4321')
            ->assertJsonPath('data.clientes.0.selos', 1)
            ->assertJsonPath('data.regras.meta', 3);

        $this->entrarComo(Papel::Administrador);
        $this->putJson('/api/configuracoes', ['fidelidade_meta' => 8, 'fidelidade_premio' => 12.5, 'fidelidade_ativa' => false])
            ->assertOk()
            ->assertJsonPath('data.fidelidade.meta', 8)
            ->assertJsonPath('data.fidelidade.premio', 12.5)
            ->assertJsonPath('data.fidelidade.ativa', false);
    }
}
