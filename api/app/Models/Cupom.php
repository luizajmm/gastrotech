<?php

namespace App\Models;

use App\Enums\TipoCupom;
use Illuminate\Database\Eloquent\Model;

class Cupom extends Model
{
    protected $table = 'cupons';

    protected $fillable = [
        'codigo', 'descricao', 'tipo', 'valor', 'pedido_minimo',
        'validade', 'limite_usos', 'usos', 'ativo',
    ];

    protected $attributes = ['ativo' => true, 'usos' => 0];

    protected function casts(): array
    {
        return [
            'tipo' => TipoCupom::class,
            'valor' => 'decimal:2',
            'pedido_minimo' => 'decimal:2',
            'validade' => 'date',
            'limite_usos' => 'integer',
            'usos' => 'integer',
            'ativo' => 'boolean',
        ];
    }

    public static function normalizar(string $codigo): string
    {
        return strtoupper(trim($codigo));
    }

    // null quando dá pra usar, senão o motivo pro cliente
    public function problemaPara(float $subtotal): ?string
    {
        return match (true) {
            ! $this->ativo => 'Este cupom não está mais valendo.',
            $this->validade !== null && $this->validade->copy()->endOfDay()->isPast() => 'Este cupom venceu.',
            $this->limite_usos !== null && $this->usos >= $this->limite_usos => 'Este cupom já atingiu o limite de usos.',
            $this->pedido_minimo !== null && $subtotal < (float) $this->pedido_minimo => 'Este cupom vale para pedidos a partir de R$ '.number_format((float) $this->pedido_minimo, 2, ',', '.').'.',
            default => null,
        };
    }

    public function descontoPara(float $subtotal): float
    {
        $desconto = $this->tipo === TipoCupom::Percentual
            ? $subtotal * (float) $this->valor / 100
            : (float) $this->valor;

        return round(min($desconto, $subtotal), 2);
    }
}
