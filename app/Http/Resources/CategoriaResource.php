<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoriaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'descricao' => $this->descricao,
            'icone' => $this->icone,
            'ordem' => $this->ordem,
            'ativo' => $this->ativo,
            'total_produtos' => $this->whenCounted('produtos'),
            'produtos' => ProdutoResource::collection($this->whenLoaded('produtos')),
        ];
    }
}
