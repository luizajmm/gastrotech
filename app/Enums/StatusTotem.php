<?php

namespace App\Enums;

enum StatusTotem: string
{
    use ListaOpcoes;

    case Online = 'online';
    case Offline = 'offline';
    case Manutencao = 'manutencao';

    public function rotulo(): string
    {
        return match ($this) {
            self::Online => 'Online',
            self::Offline => 'Offline',
            self::Manutencao => 'Manutenção',
        };
    }
}
