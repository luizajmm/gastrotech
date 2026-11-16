<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TotemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'codigo' => $this->codigo,
            'localizacao' => $this->localizacao,
            'status' => OpcaoEnum::de($this->status),
            'pedidos_hoje' => $this->whenCounted('pedidos'),
        ];
    }
}
