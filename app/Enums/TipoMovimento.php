<?php

namespace App\Enums;

enum TipoMovimento: string
{
    use ListaOpcoes;

    case Entrada = 'entrada';
    case Saida = 'saida';

    public function rotulo(): string
    {
        return match ($this) {
            self::Entrada => 'Entrada',
            self::Saida => 'Saída',
        };
    }
}
