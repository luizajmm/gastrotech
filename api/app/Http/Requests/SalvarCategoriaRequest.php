<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SalvarCategoriaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Permissão já verificada na rota (can:cardapio)
    }

    public function rules(): array
    {
        $obrigatorio = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'nome' => [$obrigatorio, 'string', 'max:120'],
            'descricao' => ['nullable', 'string', 'max:180'],
            'icone' => ['nullable', 'string', 'max:40'],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:999'],
            'ativo' => ['sometimes', 'boolean'],
        ];
    }
}
