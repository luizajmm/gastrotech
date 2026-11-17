<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemPedido extends Model
{
    protected $table = 'itens_pedido';

    public $timestamps = false;

    protected $fillable = [
        'pedido_id', 'produto_id', 'nome_produto', 'personalizacoes',
        'observacao', 'quantidade', 'preco_unitario',
    ];

    protected function casts(): array
    {
        return [
            'personalizacoes' => 'array',
            'quantidade' => 'integer',
            'preco_unitario' => 'decimal:2',
        ];
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function total(): float
    {
        return (float) $this->preco_unitario * $this->quantidade;
    }
}
