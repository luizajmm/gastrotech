<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cliente extends Model
{
    protected $table = 'clientes';

    protected $fillable = ['telefone', 'selos', 'resgates', 'ultimo_pedido_em'];

    protected $attributes = ['selos' => 0, 'resgates' => 0];

    protected function casts(): array
    {
        return [
            'selos' => 'integer',
            'resgates' => 'integer',
            'ultimo_pedido_em' => 'datetime',
        ];
    }

    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class);
    }

    // "(11) 98765-4321" vira "11987654321"; null se não parecer um celular com DDD
    public static function normalizarTelefone(?string $telefone): ?string
    {
        $numeros = preg_replace('/\D/', '', (string) $telefone);

        return strlen($numeros) >= 10 && strlen($numeros) <= 11 ? $numeros : null;
    }

    // no painel não precisa do número inteiro
    public function telefoneMascarado(): string
    {
        $t = $this->telefone;

        return '('.substr($t, 0, 2).') '.str_repeat('•', strlen($t) - 6).'-'.substr($t, -4);
    }
}
