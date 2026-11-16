<?php

namespace App\Http\Requests;

use App\Enums\FormaPagamento;
use App\Enums\TipoMovimento;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MovimentoCaixaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Permissão já verificada na rota (can:caixa)
    }

    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::enum(TipoMovimento::class)],
            'descricao' => ['required', 'string', 'max:180'],
            'forma_pagamento' => ['sometimes', Rule::enum(FormaPagamento::class)],
            'valor' => ['required', 'numeric', 'gt:0', 'max:99999'],
        ];
    }

    public function messages(): array
    {
        return ['valor.gt' => 'O valor precisa ser maior que zero.'];
    }
}
