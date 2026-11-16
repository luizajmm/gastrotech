<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SalvarProdutoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Permissão já verificada na rota (can:cardapio)
    }

    public function rules(): array
    {
        $obrigatorio = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'categoria_id' => ['nullable', 'integer', 'exists:categorias,id'],
            'nome' => [$obrigatorio, 'string', 'max:140'],
            'descricao' => ['nullable', 'string', 'max:255'],
            'preco' => [$obrigatorio, 'numeric', 'min:0', 'max:99999'],
            'estoque' => ['sometimes', 'integer', 'min:0', 'max:99999'],
            'tempo_preparo_min' => ['sometimes', 'integer', 'min:1', 'max:240'],
            'destaque' => ['sometimes', 'boolean'],
            'ativo' => ['sometimes', 'boolean'],
            'porcao' => ['nullable', 'string', 'max:120'],
            'calorias' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'ingredientes' => ['nullable', 'string', 'max:1000'],

            'destaques' => ['nullable', 'array', 'max:6'],
            'destaques.*' => ['string', 'max:40'],
            'tags' => ['nullable', 'array', 'max:6'],
            'tags.*' => ['string', 'max:40'],
            'alergenos' => ['nullable', 'array', 'max:10'],
            'alergenos.*' => ['string', 'max:40'],

            'personalizacoes' => ['nullable', 'array', 'max:6'],
            'personalizacoes.*.nome' => ['required', 'string', 'max:60', 'distinct'],
            'personalizacoes.*.opcoes' => ['required', 'array', 'min:2', 'max:12'],
            'personalizacoes.*.opcoes.*' => ['required', 'string', 'max:60', 'distinct'],
            'personalizacoes.*.obrigatorio' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'personalizacoes.*.opcoes.min' => 'Cada personalização precisa de pelo menos 2 opções.',
            'personalizacoes.*.nome.distinct' => 'Há duas personalizações com o mesmo nome.',
        ];
    }
}
