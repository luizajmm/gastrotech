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

            'destaques' => ['nullable', 'array', 'max:10'],
            'destaques.*' => ['string', 'max:60'],
            'tags' => ['nullable', 'array', 'max:6'],
            'tags.*' => ['string', 'max:40'],
            'alergenos' => ['nullable', 'array', 'max:10'],
            'alergenos.*' => ['string', 'max:40'],

            'ficha' => ['sometimes', 'nullable', 'array', 'max:20'],
            'ficha.*.insumo_id' => ['required', 'integer', 'distinct', 'exists:insumos,id'],
            'ficha.*.quantidade' => ['required', 'numeric', 'gt:0', 'max:99999'],

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
            'ficha.*.insumo_id.distinct' => 'O mesmo insumo aparece duas vezes na ficha.',
            'ficha.*.quantidade.gt' => 'A quantidade do insumo precisa ser maior que zero.',
            'descricao.max' => 'A descrição pode ter até 255 letras.',
            'porcao.max' => 'A porção pode ter até 120 letras.',
            'calorias.integer' => 'Calorias é só o número, por exemplo 450.',
            'calorias.max' => 'Confira as calorias, passou de 10.000.',
            'ingredientes.max' => 'Os ingredientes podem ter até 1.000 letras.',
            'destaques.max' => 'Use no máximo 10 destaques, separados por vírgula.',
            'destaques.*.max' => 'Cada destaque pode ter até 60 letras. Separe por vírgula.',
            'tags.max' => 'Use no máximo 6 selos, separados por vírgula.',
            'tags.*.max' => 'Cada selo pode ter até 40 letras. Separe por vírgula.',
            'alergenos.max' => 'Use no máximo 10 alergênicos, separados por vírgula.',
            'alergenos.*.max' => 'Cada alergênico pode ter até 40 letras. Separe por vírgula.',
            'personalizacoes.*.opcoes.min' => 'Cada personalização precisa de pelo menos 2 opções.',
            'personalizacoes.*.nome.distinct' => 'Há duas personalizações com o mesmo nome.',
        ];
    }
}
