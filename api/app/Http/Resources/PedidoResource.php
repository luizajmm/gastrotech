<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PedidoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'codigo' => $this->codigo,
            'nome_cliente' => $this->nome_cliente,
            'status' => OpcaoEnum::de($this->status),
            'proximo_status' => OpcaoEnum::de($this->status->proximo()),
            'status_pagamento' => OpcaoEnum::de($this->status_pagamento),
            'forma_pagamento' => OpcaoEnum::de($this->forma_pagamento),
            'consumo' => OpcaoEnum::de($this->consumo),
            'subtotal' => (float) $this->subtotal,
            'tempo_estimado_min' => $this->tempo_estimado_min,
            'minutos_decorridos' => $this->minutosDecorridos(),
            'minutos_atraso' => $this->minutosAtraso(),
            'totem' => $this->whenLoaded('totem', fn () => $this->totem?->codigo),
            'itens' => ItemPedidoResource::collection($this->whenLoaded('itens')),
            'criado_em' => $this->created_at?->toIso8601String(),
            'pago_em' => $this->pago_em?->toIso8601String(),
            'pronto_em' => $this->pronto_em?->toIso8601String(),
            'finalizado_em' => $this->finalizado_em?->toIso8601String(),
        ];
    }
}
