<?php

namespace App\Enums;

enum Consumo: string
{
    use ListaOpcoes;

    case Local = 'local';
    case Viagem = 'viagem';

    public function rotulo(): string
    {
        return match ($this) {
            self::Local => 'Comer aqui',
            self::Viagem => 'Para levar',
        };
    }
}
