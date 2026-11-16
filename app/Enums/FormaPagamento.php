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

    // pix e cartão são confirmados no próprio totem
    // dinheiro fica pendente até o pagamento no balcão
    public function pagoNoTotem(): bool
    {
        return $this !== self::Dinheiro;
    }
}
