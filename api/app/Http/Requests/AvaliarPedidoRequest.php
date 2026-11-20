<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AvaliarPedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nota' => ['required', 'integer', 'min:1', 'max:5'],
            'comentario' => ['nullable', 'string', 'max:280'],
        ];
    }

    public function messages(): array
    {
        return [
            'nota.required' => 'Escolha de 1 a 5 estrelas.',
            'nota.min' => 'Escolha de 1 a 5 estrelas.',
            'nota.max' => 'Escolha de 1 a 5 estrelas.',
            'comentario.max' => 'O comentário pode ter até 280 caracteres.',
        ];
    }
}
