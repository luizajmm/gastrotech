<?php

namespace App\Http\Resources;

use App\Enums\StatusPedido;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// o que o cliente vê no acompanhamento, sem dado interno
class AcompanhamentoPedidoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $etapas = collect(StatusPedido::fluxo());
        $atual = $etapas->search($this->status);

        return [
            'codigo' => $this->codigo,
            'nome_cliente' => $this->nome_cliente,
            'status' => OpcaoEnum::de($this->status),
            'status_pagamento' => OpcaoEnum::de($this->status_pagamento),
            'forma_pagamento' => OpcaoEnum::de($this->forma_pagamento),
            'consumo' => OpcaoEnum::de($this->consumo),
            'etapas' => $etapas->map(fn (StatusPedido $etapa, int $i) => [
                ...OpcaoEnum::de($etapa),
                'concluida' => $atual !== false && $i <= $atual,
            ])->values(),
            'subtotal' => (float) $this->subtotal,
            'desconto' => (float) $this->desconto,
            'total' => (float) $this->total,
            'cupom' => $this->cupom_codigo,
            'avaliacao' => $this->avaliacao,
            'tempo_estimado_min' => $this->tempo_estimado_min,
            'minutos_decorridos' => $this->minutosDecorridos(),
            'itens' => ItemPedidoResource::collection($this->whenLoaded('itens')),
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}
