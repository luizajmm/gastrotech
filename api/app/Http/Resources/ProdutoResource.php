<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProdutoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'categoria_id' => $this->categoria_id,
            'categoria' => $this->whenLoaded('categoria', fn () => $this->categoria ? [
                'id' => $this->categoria->id,
                'nome' => $this->categoria->nome,
            ] : null),
            'nome' => $this->nome,
            'descricao' => $this->descricao,
            'destaques' => $this->destaques ?? [],
            'personalizacoes' => $this->gruposPersonalizacao(),
            'ingredientes' => $this->ingredientes,
            'tags' => $this->tags ?? [],
            'alergenos' => $this->alergenos ?? [],
            'porcao' => $this->porcao,
            'calorias' => $this->calorias,
            'imagem_url' => $this->imagemUrl(),
            'estoque' => $this->estoque,
            'preco' => (float) $this->preco,
            'tempo_preparo_min' => $this->tempo_preparo_min,
            'destaque' => $this->destaque,
            'ativo' => $this->ativo,
            'ficha' => $this->whenLoaded('insumos', fn () => $this->insumos->map(fn ($i) => [
                'insumo_id' => $i->id,
                'nome' => $i->nome,
                'unidade' => $i->unidade,
                'quantidade' => (float) $i->pivot->quantidade,
            ])->values()),
            'disponivel' => $this->whenLoaded('insumos', fn () => $this->disponivelParaVenda()),
        ];
    }
}
