<?php

namespace App\Http\Requests;

use App\Enums\StatusTotem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SalvarTotemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Permissão já verificada na rota (can:configuracoes)
    }

    public function rules(): array
    {
        $criando = $this->isMethod('post');

        return [
            'codigo' => [
                $criando ? 'required' : 'sometimes', 'string', 'max:30',
                Rule::unique('totens', 'codigo')->ignore($this->route('totem')?->id),
            ],
            'localizacao' => [$criando ? 'required' : 'sometimes', 'string', 'max:120'],
            'status' => ['sometimes', Rule::enum(StatusTotem::class)],
        ];
    }
}
