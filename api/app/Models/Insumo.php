<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Insumo extends Model
{
    public const UNIDADES = ['un', 'g', 'kg', 'ml', 'l'];

    protected $table = 'insumos';

    protected $fillable = ['nome', 'unidade', 'estoque', 'estoque_minimo'];

    protected function casts(): array
    {
        return [
            'estoque' => 'decimal:3',
            'estoque_minimo' => 'decimal:3',
        ];
    }

    public function produtos(): BelongsToMany
    {
        return $this->belongsToMany(Produto::class, 'produto_insumo')->withPivot('quantidade');
    }

    public function scopeAcabando(Builder $query): Builder
    {
        return $query->whereNotNull('estoque_minimo')->whereColumn('estoque', '<=', 'estoque_minimo');
    }
}
