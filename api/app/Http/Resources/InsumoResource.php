<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InsumoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $estoque = (float) $this->estoque;
        $minimo = $this->estoque_minimo === null ? null : (float) $this->estoque_minimo;

        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'unidade' => $this->unidade,
            'estoque' => $estoque,
            'estoque_minimo' => $minimo,
            'acabando' => $minimo !== null && $estoque <= $minimo,
            'usado_em' => $this->whenLoaded('produtos', fn () => $this->produtos->pluck('nome')),
        ];
    }
}
