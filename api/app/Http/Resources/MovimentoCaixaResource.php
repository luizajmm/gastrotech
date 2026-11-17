<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MovimentoCaixaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'caixa_id' => $this->caixa_id,
            'tipo' => OpcaoEnum::de($this->tipo),
            'descricao' => $this->descricao,
            'forma_pagamento' => OpcaoEnum::de($this->forma_pagamento),
            'valor' => (float) $this->valor,
            'usuario' => $this->whenLoaded('usuario', fn () => $this->usuario?->name),
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}
