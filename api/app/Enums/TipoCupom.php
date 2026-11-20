<?php

namespace App\Enums;

enum TipoCupom: string
{
    use ListaOpcoes;

    case Percentual = 'percentual';
    case Valor = 'valor';

    public function rotulo(): string
    {
        return match ($this) {
            self::Percentual => 'Porcentagem',
            self::Valor => 'Valor fixo',
        };
    }
}
