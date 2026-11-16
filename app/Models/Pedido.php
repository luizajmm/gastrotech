<?php

namespace App\Models;

use App\Enums\FormaPagamento;
use App\Enums\StatusPagamento;
use App\Enums\StatusPedido;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property StatusPedido $status
 * @property StatusPagamento $status_pagamento
 * @property FormaPagamento $forma_pagamento
 */
class Pedido extends Model
{
    protected $table = 'pedidos';

    protected $fillable = [
        'totem_id', 'codigo', 'nome_cliente', 'status', 'status_pagamento',
        'forma_pagamento', 'subtotal', 'tempo_estimado_min',
        'pago_em', 'pronto_em', 'finalizado_em',
    ];

    protected function casts(): array
    {
        return [
            'status' => StatusPedido::class,
            'status_pagamento' => StatusPagamento::class,
            'forma_pagamento' => FormaPagamento::class,
            'subtotal' => 'decimal:2',
            'tempo_estimado_min' => 'integer',
            'pago_em' => 'datetime',
            'pronto_em' => 'datetime',
            'finalizado_em' => 'datetime',
        ];
    }

    public function itens(): HasMany
    {
        return $this->hasMany(ItemPedido::class);
    }

    public function totem(): BelongsTo
    {
        return $this->belongsTo(Totem::class);
    }

    public function scopeAtivos(Builder $query): Builder
    {
        return $query->whereIn('status', StatusPedido::ativos());
    }

    public function scopePagos(Builder $query): Builder
    {
        return $query->where('status_pagamento', StatusPagamento::Pago);
    }

    public function minutosDecorridos(): int
    {
        $fim = $this->status->emProducao() ? now() : ($this->pronto_em ?? $this->finalizado_em ?? now());

        return max(0, (int) $this->created_at->diffInMinutes($fim));
    }

    public function minutosAtraso(): int
    {
        if (! $this->status->emProducao()) {
            return 0;
        }

        return max(0, $this->minutosDecorridos() - $this->tempo_estimado_min);
    }

    /** Código curto mostrado ao cliente: A101, A102... */
    public static function gerarCodigo(int $id): string
    {
        return 'A'.(100 + $id);
    }
}
