<?php

namespace App\Http\Requests;

use App\Enums\TipoCupom;
use App\Models\Cupom;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SalvarCupomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // permissão já verificada na rota (can:cardapio)
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('codigo')) {
            $this->merge(['codigo' => Cupom::normalizar((string) $this->input('codigo'))]);
        }
    }

    public function rules(): array
    {
        $obrigatorio = $this->isMethod('post') ? 'required' : 'sometimes';
        $cupom = $this->route('cupom');
        $tipo = $this->input('tipo', $cupom?->tipo?->value);

        return [
            'codigo' => [$obrigatorio, 'string', 'min:3', 'max:30', 'regex:/^[A-Z0-9_-]+$/', Rule::unique('cupons', 'codigo')->ignore($cupom?->id)],
            'descricao' => ['nullable', 'string', 'max:120'],
            'tipo' => [$obrigatorio, Rule::enum(TipoCupom::class)],
            'valor' => [$obrigatorio, 'numeric', 'gt:0', $tipo === TipoCupom::Percentual->value ? 'max:100' : 'max:9999'],
            'pedido_minimo' => ['nullable', 'numeric', 'min:0', 'max:99999'],
            'validade' => ['nullable', 'date_format:Y-m-d'],
            'limite_usos' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'ativo' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'codigo.regex' => 'Use só letras, números, - e _ no código.',
            'codigo.unique' => 'Já existe um cupom com esse código.',
            'valor.max' => $this->input('tipo') === TipoCupom::Percentual->value ? 'A porcentagem vai até 100.' : 'Valor alto demais.',
            'valor.gt' => 'O desconto precisa ser maior que zero.',
        ];
    }
}
