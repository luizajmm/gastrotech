<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Storage;

class Produto extends Model
{
    use HasFactory;

    protected $table = 'produtos';

    protected $fillable = [
        'categoria_id', 'nome', 'descricao', 'destaques', 'personalizacoes',
        'ingredientes', 'tags', 'alergenos', 'porcao', 'calorias', 'imagem',
        'estoque', 'preco', 'tempo_preparo_min', 'destaque', 'ativo',
    ];

    protected $attributes = ['ativo' => true, 'destaque' => false, 'estoque' => 0];

    protected function casts(): array
    {
        return [
            'destaques' => 'array',
            'personalizacoes' => 'array',
            'tags' => 'array',
            'alergenos' => 'array',
            'calorias' => 'integer',
            'estoque' => 'integer',
            'preco' => 'decimal:2',
            'tempo_preparo_min' => 'integer',
            'destaque' => 'boolean',
            'ativo' => 'boolean',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    // ficha técnica
    public function insumos(): BelongsToMany
    {
        return $this->belongsToMany(Insumo::class, 'produto_insumo')->withPivot('quantidade');
    }

    // quantas unidades dá pra vender agora: o menor entre o estoque do produto
    // e o que os insumos da ficha ainda rendem (precisa dos insumos carregados)
    public function disponivelParaVenda(): int
    {
        $rendimento = $this->insumos->map(
            fn (Insumo $i) => (int) floor((float) $i->estoque / max(0.001, (float) $i->pivot->quantidade) + 1e-9)
        );

        return (int) min($this->estoque, $rendimento->min() ?? PHP_INT_MAX);
    }

    public function scopeDisponiveis(Builder $query): Builder
    {
        return $query->where('ativo', true)->where('estoque', '>', 0);
    }

    public function scopeEstoqueBaixo(Builder $query, int $limite): Builder
    {
        return $query->where('estoque', '<=', $limite);
    }

    public function imagemUrl(): ?string
    {
        return $this->imagem ? Storage::disk('public')->url($this->imagem) : null;
    }

    public function gruposPersonalizacao(): array
    {
        return array_map(fn (array $grupo) => [
            'nome' => (string) $grupo['nome'],
            'opcoes' => array_values($grupo['opcoes'] ?? []),
            'obrigatorio' => (bool) ($grupo['obrigatorio'] ?? true),
        ], $this->personalizacoes ?? []);
    }
}
