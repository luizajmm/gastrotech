<?php

namespace App\Http\Requests;

use App\Enums\FormaPagamento;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class FiltroPeriodoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'data_inicio' => ['nullable', 'date_format:Y-m-d'],
            'data_fim' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:data_inicio'],
            'forma_pagamento' => ['nullable', Rule::enum(FormaPagamento::class)],
        ];
    }

    // padrão: últimos 7 dias, incluindo hoje
    public function inicio(): Carbon
    {
        return $this->filled('data_inicio')
            ? Carbon::parse($this->input('data_inicio'))->startOfDay()
            : now()->subDays(6)->startOfDay();
    }

    public function fim(): Carbon
    {
        return $this->filled('data_fim')
            ? Carbon::parse($this->input('data_fim'))->endOfDay()
            : now()->endOfDay();
    }

    public function forma(): ?FormaPagamento
    {
        return FormaPagamento::tryFrom((string) $this->input('forma_pagamento'));
    }
}
