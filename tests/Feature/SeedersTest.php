<?php

namespace Tests\Feature;

use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SeedersTest extends TestCase
{
    use RefreshDatabase;

    public function test_dados_de_demonstracao_sao_carregados(): void
    {
        Storage::fake('public');
        $this->seed();

        $this->assertSame(4, User::query()->count());
        $this->assertSame(6, Produto::query()->count());
        $this->assertGreaterThan(50, Pedido::query()->count());
        $this->assertSame(0, Pedido::query()->whereNull('codigo')->count());

        $token = $this->postJson('/api/login', ['email' => 'admin@gastrotech.com', 'senha' => 'gastrotech'])
            ->assertOk()->json('token');

        $this->withToken($token)->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.fila.total', 5);
    }
}
