<?php

namespace App\Models;

use App\Enums\StatusCaixa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Caixa extends Model
{
    protected $table = 'caixas';

    protected $fillable = [
        'saldo_inicial', 'saldo_final', 'status',
        'aberto_por', 'fechado_por', 'aberto_em', 'fechado_em',
    ];

    protected function casts(): array
    {
        return [
            'saldo_inicial' => 'decimal:2',
            'saldo_final' => 'decimal:2',
            'status' => StatusCaixa::class,
            'aberto_em' => 'datetime',
            'fechado_em' => 'datetime',
        ];
    }

    public function movimentos(): HasMany
    {
        return $this->hasMany(MovimentoCaixa::class);
    }

    public function abertoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aberto_por');
    }

    public function fechadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fechado_por');
    }

    /** Caixa aberto no momento, se houver. */
    public static function aberto(): ?self
    {
        return static::query()
            ->where('status', StatusCaixa::Aberto)
            ->latest('aberto_em')
            ->latest('id')
            ->first();
    }
}
