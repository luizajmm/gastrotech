<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Cardápio original do GastroTech, agora com dados estruturados.
 */
class CardapioSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [];

        foreach ([
            ['Combos', 'Lanche, acompanhamento e bebida', 'combo'],
            ['Hambúrgueres', 'Lanches principais do cardápio', 'burger'],
            ['Porções', 'Acompanhamentos para compartilhar', 'porcao'],
            ['Bebidas', 'Bebidas geladas', 'bebida'],
            ['Sobremesas', 'Opções doces', 'sobremesa'],
            ['Adicionais', 'Molhos e extras', 'molho'],
        ] as $ordem => [$nome, $descricao, $icone]) {
            $categorias[$nome] = Categoria::query()->updateOrCreate(
                ['nome' => $nome],
                ['descricao' => $descricao, 'icone' => $icone, 'ordem' => $ordem + 1, 'ativo' => true],
            );
        }

        $sabores = ['Coca-Cola', 'Guaraná', 'Fanta Laranja', 'Suco de laranja', 'Suco de uva'];
        $gelo = ['nome' => 'Gelo', 'opcoes' => ['Com gelo', 'Sem gelo'], 'obrigatorio' => true];

        $produtos = [
            [
                'categoria' => 'Combos',
                'nome' => 'Combo Smash',
                'descricao' => 'Smash burger na chapa, batata sequinha e refrigerante gelado.',
                'destaques' => ['Burger', 'Batata', 'Refri ou suco'],
                'personalizacoes' => [['nome' => 'Bebida do combo', 'opcoes' => $sabores, 'obrigatorio' => true], $gelo],
                'ingredientes' => 'Pão brioche, blend bovino 120g, cheddar, picles, molho especial, batata palito, refrigerante lata',
                'tags' => ['Mais vendido', 'Completo'],
                'alergenos' => ['Glúten', 'Leite'],
                'porcao' => '1 lanche + batata + bebida',
                'calorias' => 920,
                'imagem' => 'combo-smash.jpg',
                'estoque' => 24,
                'preco' => 32.90,
                'tempo_preparo_min' => 18,
                'destaque' => true,
            ],
            [
                'categoria' => 'Hambúrgueres',
                'nome' => 'X-Bacon Artesanal',
                'descricao' => 'Pão brioche tostado, bacon crocante, cheddar e molho da casa.',
                'destaques' => ['Pão brioche', 'Bacon', 'Cheddar'],
                'personalizacoes' => [['nome' => 'Ponto da carne', 'opcoes' => ['Ao ponto', 'Bem passado'], 'obrigatorio' => true]],
                'ingredientes' => 'Pão brioche, hambúrguer artesanal, bacon em tiras, queijo cheddar, cebola caramelizada, molho da casa',
                'tags' => ['Artesanal', 'Chapa'],
                'alergenos' => ['Glúten', 'Leite'],
                'porcao' => '1 lanche artesanal',
                'calorias' => 680,
                'imagem' => 'x-bacon-artesanal.jpg',
                'estoque' => 18,
                'preco' => 24.90,
                'tempo_preparo_min' => 16,
                'destaque' => true,
            ],
            [
                'categoria' => 'Porções',
                'nome' => 'Batata Suprema',
                'descricao' => 'Batata crocante coberta com cheddar cremoso e bacon.',
                'destaques' => ['Cheddar', 'Bacon', 'Média'],
                'personalizacoes' => null,
                'ingredientes' => 'Batata palito, creme de cheddar, bacon crocante, cebolinha, tempero da casa',
                'tags' => ['Compartilhar', 'Crocante'],
                'alergenos' => ['Leite'],
                'porcao' => 'Porção média 350g',
                'calorias' => 540,
                'imagem' => 'batata-suprema.jpg',
                'estoque' => 12,
                'preco' => 18.00,
                'tempo_preparo_min' => 10,
                'destaque' => false,
            ],
            [
                'categoria' => 'Bebidas',
                'nome' => 'Bebida Gelada',
                'descricao' => 'Lata 350ml ou suco gelado para acompanhar qualquer pedido.',
                'destaques' => ['Coca-Cola', 'Guaraná', 'Fanta', 'Suco'],
                'personalizacoes' => [['nome' => 'Sabor', 'opcoes' => $sabores, 'obrigatorio' => true], $gelo],
                'ingredientes' => 'Bebida escolhida, gelo opcional',
                'tags' => ['Gelado', 'Rápido'],
                'alergenos' => [],
                'porcao' => 'Lata 350ml ou copo 500ml',
                'calorias' => 140,
                'imagem' => 'bebida-gelada.jpg',
                'estoque' => 42,
                'preco' => 6.00,
                'tempo_preparo_min' => 2,
                'destaque' => false,
            ],
            [
                'categoria' => 'Sobremesas',
                'nome' => 'Milkshake Chocolate',
                'descricao' => 'Milkshake cremoso de chocolate com chantilly e calda.',
                'destaques' => ['400ml', 'Chocolate'],
                'personalizacoes' => [['nome' => 'Cobertura', 'opcoes' => ['Com chantilly', 'Sem chantilly'], 'obrigatorio' => false]],
                'ingredientes' => 'Sorvete de chocolate, leite, calda de chocolate, chantilly, raspas de chocolate',
                'tags' => ['Cremoso', 'Doce'],
                'alergenos' => ['Leite'],
                'porcao' => 'Copo 400ml',
                'calorias' => 460,
                'imagem' => 'milkshake-chocolate.jpg',
                'estoque' => 7,
                'preco' => 16.90,
                'tempo_preparo_min' => 8,
                'destaque' => true,
            ],
            [
                'categoria' => 'Adicionais',
                'nome' => 'Molho Extra',
                'descricao' => 'Pote extra de barbecue defumado ou maionese verde.',
                'destaques' => ['Barbecue', 'Maionese verde'],
                'personalizacoes' => [['nome' => 'Molho', 'opcoes' => ['Barbecue defumado', 'Maionese verde'], 'obrigatorio' => true]],
                'ingredientes' => 'Barbecue defumado, maionese verde, ervas frescas, especiarias',
                'tags' => ['Extra', 'Molhos'],
                'alergenos' => ['Ovo'],
                'porcao' => 'Pote 40ml',
                'calorias' => 95,
                'imagem' => 'molho-extra.jpg',
                'estoque' => 35,
                'preco' => 3.50,
                'tempo_preparo_min' => 1,
                'destaque' => false,
            ],
        ];

        foreach ($produtos as $dados) {
            $arquivo = 'produtos/'.$dados['imagem'];
            Storage::disk('public')->put($arquivo, file_get_contents(__DIR__.'/imagens/'.$dados['imagem']));

            Produto::query()->updateOrCreate(
                ['nome' => $dados['nome']],
                [
                    ...collect($dados)->except(['categoria', 'imagem'])->all(),
                    'categoria_id' => $categorias[$dados['categoria']]->id,
                    'imagem' => $arquivo,
                    'ativo' => true,
                ],
            );
        }
    }
}
