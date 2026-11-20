<?php

namespace App\Http\Requests;

use App\Enums\Consumo;
use App\Enums\FormaPagamento;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// preço e estoque são conferidos no PedidoService, aqui só o formato
class CriarPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nome_cliente' => ['nullable', 'string', 'max:60'],
            'forma_pagamento' => ['required', Rule::enum(FormaPagamento::class)],
            'consumo' => ['nullable', Rule::enum(Consumo::class)],
            'totem' => ['nullable', 'string', 'exists:totens,codigo'],
            'itens' => ['required', 'array', 'min:1', 'max:30'],
            'itens.*.produto_id' => ['required', 'integer'],
            'itens.*.quantidade' => ['required', 'integer', 'min:1', 'max:20'],
            'itens.*.personalizacoes' => ['nullable', 'array'],
            'itens.*.personalizacoes.*' => ['nullable', 'string', 'max:80'],
            'itens.*.observacao' => ['nullable', 'string', 'max:180'],
        ];
    }

    public function messages(): array
    {
        return [
            'itens.required' => 'Adicione pelo menos um item ao pedido.',
            'itens.min' => 'Adicione pelo menos um item ao pedido.',
            'forma_pagamento.required' => 'Escolha a forma de pagamento.',
        ];
    }
}
