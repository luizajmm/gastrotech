<?php

namespace App\Enums;

/**
 * Ajuda os enums a se descreverem para o front-end
 * (valor técnico + texto bonito para exibir).
 */
trait ListaOpcoes
{
    abstract public function rotulo(): string;

    /** @return list<array{valor: string, rotulo: string}> */
    public static function opcoes(): array
    {
        return array_map(
            fn (self $caso) => ['valor' => $caso->value, 'rotulo' => $caso->rotulo()],
            self::cases(),
        );
    }

    /** @return list<string> */
    public static function valores(): array
    {
        return array_column(self::cases(), 'value');
    }
}
