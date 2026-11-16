<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConfiguracoesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Permissão já verificada na rota (can:configuracoes)
    }

    public function rules(): array
    {
        return [
            'nome_loja' => ['sometimes', 'required', 'string', 'max:60'],
            'frase_totem' => ['sometimes', 'nullable', 'string', 'max:120'],
            'tempo_espera_min' => ['sometimes', 'required', 'integer', 'min:1', 'max:180'],
            'estoque_baixo' => ['sometimes', 'required', 'integer', 'min:0', 'max:999'],
        ];
    }
}
