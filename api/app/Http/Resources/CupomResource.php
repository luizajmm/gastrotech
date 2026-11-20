<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CupomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'codigo' => $this->codigo,
            'descricao' => $this->descricao,
            'tipo' => OpcaoEnum::de($this->tipo),
            'valor' => (float) $this->valor,
            'pedido_minimo' => $this->pedido_minimo === null ? null : (float) $this->pedido_minimo,
            'validade' => $this->validade?->toDateString(),
            'limite_usos' => $this->limite_usos,
            'usos' => $this->usos,
            'ativo' => $this->ativo,
        ];
    }
}
