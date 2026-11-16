<?php

namespace Tests\Feature;

use App\Enums\Papel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UsuariosTest extends TestCase
{
    use RefreshDatabase;

    public function test_cadastro_exige_senha(): void
    {
        $this->entrarComo();

        $this->postJson('/api/usuarios', ['nome' => 'Bia', 'email' => 'bia@x.com', 'papel' => 'cardapio'])
            ->assertUnprocessable()->assertJsonValidationErrors('senha');

        $this->postJson('/api/usuarios', ['nome' => 'Bia', 'email' => 'BIA@x.com', 'senha' => 'segura1', 'papel' => 'cardapio'])
            ->assertCreated()->assertJsonPath('data.email', 'bia@x.com');

        $this->assertTrue(Hash::check('segura1', User::query()->where('email', 'bia@x.com')->value('password')));
    }

    public function test_nao_exclui_a_si_mesmo(): void
    {
        $eu = $this->entrarComo();

        $this->deleteJson("/api/usuarios/{$eu->id}")->assertUnprocessable();
        $this->assertModelExists($eu);
    }

    public function test_nao_tira_o_proprio_acesso_de_admin(): void
    {
        $eu = $this->entrarComo();

        $this->putJson("/api/usuarios/{$eu->id}", ['papel' => 'leitura'])->assertUnprocessable();
        $this->putJson("/api/usuarios/{$eu->id}", ['ativo' => false])->assertUnprocessable();
    }

    public function test_edicao_sem_senha_mantem_a_senha(): void
    {
        $this->entrarComo();
        $outro = User::factory()->create(['password' => 'antiga1']);

        $this->putJson("/api/usuarios/{$outro->id}", ['nome' => 'Novo nome', 'senha' => ''])->assertOk();

        $this->assertTrue(Hash::check('antiga1', $outro->fresh()->password));
        $this->assertSame('Novo nome', $outro->fresh()->name);
    }

    public function test_email_duplicado_e_recusado(): void
    {
        $this->entrarComo();
        User::factory()->create(['email' => 'repetido@x.com']);

        $this->postJson('/api/usuarios', ['nome' => 'X', 'email' => 'repetido@x.com', 'senha' => 'segura1', 'papel' => 'leitura'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_somente_admin_gerencia_usuarios(): void
    {
        $this->entrarComo(Papel::Atendimento);

        $this->getJson('/api/usuarios')->assertForbidden();
    }
}
