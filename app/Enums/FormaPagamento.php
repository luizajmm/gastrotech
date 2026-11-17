<?php

namespace App\Enums;

enum FormaPagamento: string
{
    use ListaOpcoes;

    case Pix = 'pix';
    case Cartao = 'cartao';
    case Dinheiro = 'dinheiro';

    public function rotulo(): string
    {
        return match ($this) {
            self::Pix => 'Pix',
            self::Cartao => 'Cartão',
            self::Dinheiro => 'Dinheiro',
        };
    }

    // dinheiro só fica pago depois que o caixa confirma
    public function pagoNoTotem(): bool
    {
        return $this !== self::Dinheiro;
    }
}
