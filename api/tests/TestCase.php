<?php

namespace Tests;

use App\Enums\Papel;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /** Faz login na API com um usuário do papel informado. */
    protected function entrarComo(Papel $papel = Papel::Administrador): User
    {
        $usuario = User::factory()->papel($papel)->create();
        Sanctum::actingAs($usuario);

        return $usuario;
    }
}
