<?php

namespace Database\Seeders;

use App\Enums\StatusTotem;
use App\Models\Configuracao;
use App\Models\Totem;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class LojaSeeder extends Seeder
{
    public function run(): void
    {
        $logo = 'marca/gastrotech-logo.jpg';
        Storage::disk('public')->put($logo, file_get_contents(__DIR__.'/imagens/gastrotech-logo.jpg'));

        Configuracao::definir('nome_loja', 'GastroTech', 'Nome exibido no totem e no painel');
        Configuracao::definir('frase_totem', 'Monte seu pedido do seu jeito.', 'Frase curta exibida no totem');
        Configuracao::definir('logo', $logo, 'Logo da loja (caminho no disco público)');
        Configuracao::definir('tempo_espera_min', '18', 'Previsão em minutos exibida ao cliente');
        Configuracao::definir('estoque_baixo', '10', 'Abaixo disso o produto aparece como estoque baixo');

        $totens = [
            ['TOTEM-01', 'Entrada principal', StatusTotem::Online],
            ['TOTEM-02', 'Balcão lateral', StatusTotem::Online],
            ['TOTEM-03', 'Área externa', StatusTotem::Manutencao],
        ];

        foreach ($totens as [$codigo, $local, $status]) {
            Totem::query()->updateOrCreate(['codigo' => $codigo], ['localizacao' => $local, 'status' => $status]);
        }
    }
}
