<?php

namespace App\Models;

use App\Enums\FormaPagamento;
use App\Enums\TipoMovimento;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimentoCaixa extends Model
{
    protected $table = 'movimentos_caixa';

    protected $fillable = ['caixa_id', 'user_id', 'tipo', 'descricao', 'forma_pagamento', 'valor'];

    protected function casts(): array
    {
        return [
            'tipo' => TipoMovimento::class,
            'forma_pagamento' => FormaPagamento::class,
            'valor' => 'decimal:2',
        ];
    }

    public function caixa(): BelongsTo
    {
        return $this->belongsTo(Caixa::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
