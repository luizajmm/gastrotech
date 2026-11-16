<?php

namespace App\Enums;

enum StatusCaixa: string
{
    use ListaOpcoes;

    case Aberto = 'aberto';
    case Fechado = 'fechado';

    public function rotulo(): string
    {
        return match ($this) {
            self::Aberto => 'Aberto',
            self::Fechado => 'Fechado',
        };
    }
}
