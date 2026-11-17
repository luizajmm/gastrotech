<?php

namespace Database\Seeders;

use App\Enums\Papel;
use App\Models\User;
use Illuminate\Database\Seeder;

class UsuariosSeeder extends Seeder
{
    /**
     * Um usuário por papel, para demonstrar as permissões na apresentação.
     * Senha de todos: gastrotech (troque em produção).
     */
    public function run(): void
    {
        $usuarios = [
            ['Administrador', 'admin@gastrotech.com', Papel::Administrador],
            ['Equipe Cardápio', 'cardapio@gastrotech.com', Papel::Cardapio],
            ['Equipe Atendimento', 'atendimento@gastrotech.com', Papel::Atendimento],
            ['Consulta', 'leitura@gastrotech.com', Papel::Leitura],
        ];

        foreach ($usuarios as [$nome, $email, $papel]) {
            User::query()->updateOrCreate(
                ['email' => $email],
                ['name' => $nome, 'password' => 'gastrotech', 'papel' => $papel, 'ativo' => true],
            );
        }
    }
}
