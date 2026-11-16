<?php

namespace App\Http\Resources;

/**
 * Converte um enum em {valor, rotulo} para o front-end exibir sem tradução própria.
 */
final class OpcaoEnum
{
    /** @return array{valor: string, rotulo: string}|null */
    public static function de(?\BackedEnum $caso): ?array
    {
        if ($caso === null) {
            return null;
        }

        return ['valor' => $caso->value, 'rotulo' => method_exists($caso, 'rotulo') ? $caso->rotulo() : $caso->value];
    }
}
