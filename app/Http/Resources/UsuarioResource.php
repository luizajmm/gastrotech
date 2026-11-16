<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UsuarioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->name,
            'email' => $this->email,
            'papel' => OpcaoEnum::de($this->papel),
            'permissoes' => $this->ativo ? $this->papel->permissoes() : [],
            'ativo' => $this->ativo,
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}
