<?php

namespace Database\Factories;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Produto>
 */
class ProdutoFactory extends Factory
{
    protected $model = Produto::class;

    public function definition(): array
    {
        return [
            'categoria_id' => Categoria::factory(),
            'nome' => ucfirst(fake()->unique()->words(2, true)),
            'descricao' => fake()->sentence(),
            'estoque' => 20,
            'preco' => fake()->randomFloat(2, 5, 50),
            'tempo_preparo_min' => fake()->numberBetween(2, 20),
            'ativo' => true,
        ];
    }

    public function comPersonalizacao(): static
    {
        return $this->state(fn () => [
            'personalizacoes' => [
                ['nome' => 'Sabor', 'opcoes' => ['Coca-Cola', 'Guaraná'], 'obrigatorio' => true],
                ['nome' => 'Gelo', 'opcoes' => ['Com gelo', 'Sem gelo'], 'obrigatorio' => false],
            ],
        ]);
    }
}
