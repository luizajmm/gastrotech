<?php

namespace App\Http\Requests;

use App\Models\Insumo;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SalvarInsumoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // permissão já verificada na rota (can:cardapio)
    }

    public function rules(): array
    {
        $obrigatorio = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'nome' => [$obrigatorio, 'string', 'max:80', Rule::unique('insumos', 'nome')->ignore($this->route('insumo')?->id)],
            'unidade' => [$obrigatorio, Rule::in(Insumo::UNIDADES)],
            'estoque' => ['sometimes', 'numeric', 'min:0', 'max:9999999'],
            'estoque_minimo' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
        ];
    }

    public function messages(): array
    {
        return ['nome.unique' => 'Já existe um insumo com esse nome.'];
    }
}
