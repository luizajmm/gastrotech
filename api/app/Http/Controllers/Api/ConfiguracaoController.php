<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ConfiguracoesRequest;
use App\Http\Requests\ImagemRequest;
use App\Models\Configuracao;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class ConfiguracaoController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->dados()]);
    }

    public function update(ConfiguracoesRequest $request): JsonResponse
    {
        foreach ($request->validated() as $chave => $valor) {
            Configuracao::definir($chave, match (true) {
                $valor === null => null,
                is_bool($valor) => $valor ? '1' : '0',
                default => (string) $valor,
            });
        }

        return response()->json(['data' => $this->dados()]);
    }

    public function enviarLogo(ImagemRequest $request): JsonResponse
    {
        $antiga = Configuracao::valor('logo');
        Configuracao::definir('logo', $request->file('imagem')->store('marca', 'public'));

        if ($antiga) {
            Storage::disk('public')->delete($antiga);
        }

        return response()->json(['data' => $this->dados()]);
    }

    private function dados(): array
    {
        return [
            ...Configuracao::publicas(),
            'estoque_baixo' => Configuracao::inteiro('estoque_baixo'),
        ];
    }
}
