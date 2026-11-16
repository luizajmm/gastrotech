<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ItemPedido */
class ItemPedidoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'produto_id' => $this->produto_id,
            'nome' => $this->nome_produto,
            'personalizacoes' => collect($this->personalizacoes ?? [])
                ->map(fn ($opcao, $grupo) => ['grupo' => $grupo, 'opcao' => $opcao])
                ->values(),
            'observacao' => $this->observacao,
            'quantidade' => $this->quantidade,
            'preco_unitario' => (float) $this->preco_unitario,
            'total' => $this->total(),
        ];
    }
}
