<?php

namespace App\Http\Requests;

use App\Enums\Papel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class SalvarUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Permissão já verificada na rota (can:usuarios)
    }

    public function rules(): array
    {
        $criando = $this->isMethod('post');
        $usuario = $this->route('usuario');

        return [
            'nome' => [$criando ? 'required' : 'sometimes', 'string', 'max:120'],
            'email' => [
                $criando ? 'required' : 'sometimes', 'email', 'max:160',
                Rule::unique('users', 'email')->ignore($usuario?->id),
            ],
            // na versão antiga usuário sem senha ganhava "123"
            'senha' => [$criando ? 'required' : 'nullable', 'string', Password::min(6)],
            'papel' => [$criando ? 'required' : 'sometimes', Rule::enum(Papel::class)],
            'ativo' => ['sometimes', 'boolean'],
        ];
    }

    public function attributes(): array
    {
        return ['senha' => 'senha'];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => strtolower(trim((string) $this->input('email')))]);
        }
    }
}
