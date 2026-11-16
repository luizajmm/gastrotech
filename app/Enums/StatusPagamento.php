<?php

namespace App\Enums;

enum StatusPagamento: string
{
    use ListaOpcoes;

    case Pendente = 'pendente';
    case Pago = 'pago';
    case Estornado = 'estornado';

    public function rotulo(): string
    {
        return match ($this) {
            self::Pendente => 'Pendente',
            self::Pago => 'Pago',
            self::Estornado => 'Estornado',
        };
    }
}
