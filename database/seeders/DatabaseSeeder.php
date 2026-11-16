<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UsuariosSeeder::class,
            LojaSeeder::class,
            CardapioSeeder::class,
            PedidosDemonstracaoSeeder::class,
        ]);
    }
}
