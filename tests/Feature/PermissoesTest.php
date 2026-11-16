<?php

namespace Tests\Feature;

use App\Enums\Papel;
use App\Models\Categoria;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissoesTest extends TestCase
{
    use RefreshDatabase;

    public function test_equipe_do_cardapio_cadastra_produto_mas_nao_usuario(): void
    {
        $categoria = Categoria::factory()->create();
        $this->entrarComo(Papel::Cardapio);

        $this->postJson('/api/produtos', [
            'nome' => 'X-Salada',
            'preco' => 19.9,
            'categoria_id' => $categoria->id,
            'personalizacoes' => [['nome' => 'Ponto', 'opcoes' => ['Ao ponto', 'Bem passado']]],
        ])->assertCreated()->assertJsonPath('data.personalizacoes.0.obrigatorio', true);

        $this->postJson('/api/usuarios', ['nome' => 'X', 'email' => 'x@x.com', 'senha' => '123456', 'papel' => 'leitura'])
            ->assertForbidden();
    }

    public function test_atendimento_nao_altera_cardapio(): void
    {
        $produto = Produto::factory()->create();
        $this->entrarComo(Papel::Atendimento);

        $this->putJson("/api/produtos/{$produto->id}", ['preco' => 1])->assertForbidden();
        $this->deleteJson("/api/produtos/{$produto->id}")->assertForbidden();
        $this->assertModelExists($produto);
    }

    public function test_somente_leitura_consulta_mas_nao_altera(): void
    {
        $produto = Produto::factory()->create();
        $this->entrarComo(Papel::Leitura);

        $this->getJson('/api/produtos')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/dashboard')->assertOk();
        $this->getJson('/api/financeiro/vendas')->assertOk();
        $this->deleteJson("/api/produtos/{$produto->id}")->assertForbidden();
        $this->putJson('/api/configuracoes', ['nome_loja' => 'Outra'])->assertForbidden();
        $this->postJson('/api/financeiro/caixa/abrir', ['saldo_inicial' => 10])->assertForbidden();
    }

    public function test_exclusao_so_por_delete_e_nao_por_link(): void
    {
        $produto = Produto::factory()->create();
        $this->entrarComo(Papel::Administrador);

        // Abrir um link (GET) nunca apaga nada
        $this->getJson("/api/produtos/{$produto->id}?excluir=1")->assertOk();
        $this->assertModelExists($produto);

        $this->deleteJson("/api/produtos/{$produto->id}")->assertOk();
        $this->assertModelMissing($produto);
    }

    public function test_validacao_do_produto(): void
    {
        $this->entrarComo(Papel::Cardapio);

        $this->postJson('/api/produtos', ['preco' => -5, 'personalizacoes' => [['nome' => 'Só uma', 'opcoes' => ['A']]]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['nome', 'preco', 'personalizacoes.0.opcoes']);
    }

    public function test_excluir_categoria_mantem_produtos(): void
    {
        $produto = Produto::factory()->create();
        $this->entrarComo(Papel::Cardapio);

        $this->deleteJson("/api/categorias/{$produto->categoria_id}")->assertOk();
        $this->assertNull($produto->fresh()->categoria_id);
    }

    public function test_usuario_inativo_e_bloqueado_mesmo_logado(): void
    {
        $usuario = User::factory()->administrador()->inativo()->create();
        \Laravel\Sanctum\Sanctum::actingAs($usuario);

        $this->getJson('/api/dashboard')->assertUnauthorized();
    }
}
