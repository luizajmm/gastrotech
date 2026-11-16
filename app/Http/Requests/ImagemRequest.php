<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

/**
 * Upload de imagem (produto ou logo). O Laravel confere o conteúdo real
 * do arquivo, não o tipo que o navegador diz que ele é.
 */
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
