<?php

namespace App\Http\Resources;

final class OpcaoEnum
{
    public static function de(?\BackedEnum $caso): ?array
    {
        if ($caso === null) {
            return null;
        }

        return ['valor' => $caso->value, 'rotulo' => method_exists($caso, 'rotulo') ? $caso->rotulo() : $caso->value];
    }
}
