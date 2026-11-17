<?php

namespace App\Enums;

trait ListaOpcoes
{
    abstract public function rotulo(): string;

    public static function opcoes(): array
    {
        return array_map(
            fn (self $caso) => ['valor' => $caso->value, 'rotulo' => $caso->rotulo()],
            self::cases(),
        );
    }

    public static function valores(): array
    {
        return array_column(self::cases(), 'value');
    }
}
