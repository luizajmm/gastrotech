<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

// confere o conteúdo do arquivo, não só a extensão
class ImagemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'imagem' => ['required', File::image()->types(['jpg', 'jpeg', 'png', 'webp'])->max(4 * 1024)],
        ];
    }
}
