<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CaixaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => OpcaoEnum::de($this->status),
            'saldo_inicial' => (float) $this->saldo_inicial,
            'saldo_final' => $this->saldo_final !== null ? (float) $this->saldo_final : null,
            'aberto_em' => $this->aberto_em?->toIso8601String(),
            'fechado_em' => $this->fechado_em?->toIso8601String(),
            'aberto_por' => $this->whenLoaded('abertoPor', fn () => $this->abertoPor?->name),
            'fechado_por' => $this->whenLoaded('fechadoPor', fn () => $this->fechadoPor?->name),
        ];
    }
}
