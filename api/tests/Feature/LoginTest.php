<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_com_dados_corretos_devolve_token(): void
    {
        User::factory()->administrador()->create(['email' => 'admin@gastrotech.com', 'password' => 'segredo123']);

        $this->postJson('/api/login', ['email' => 'ADMIN@gastrotech.com ', 'senha' => 'segredo123'])
            ->assertOk()
            ->assertJsonStructure(['token', 'expira_em', 'usuario' => ['id', 'nome', 'papel', 'permissoes']])
            ->assertJsonPath('usuario.papel.valor', 'administrador');
    }

    public function test_senha_errada_e_recusada(): void
    {
        User::factory()->create(['email' => 'a@b.com', 'password' => 'certa']);

        $this->postJson('/api/login', ['email' => 'a@b.com', 'senha' => 'errada'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_usuario_desativado_nao_entra(): void
    {
        User::factory()->inativo()->create(['email' => 'a@b.com', 'password' => 'certa']);

        $this->postJson('/api/login', ['email' => 'a@b.com', 'senha' => 'certa'])
            ->assertUnprocessable();
    }

    public function test_rotas_do_painel_exigem_login(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
        $this->getJson('/api/pedidos')->assertUnauthorized();
    }

    public function test_token_de_usuario_desativado_para_de_funcionar(): void
    {
        $usuario = User::factory()->create(['password' => 'certa']);
        $token = $usuario->createToken('painel')->plainTextToken;

        $this->withToken($token)->getJson('/api/eu')->assertOk();

        $usuario->update(['ativo' => false]);
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/eu')->assertUnauthorized();
    }
}
