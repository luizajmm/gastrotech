<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UsuarioResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'email' => ['required', 'string', 'max:160'],
            'senha' => ['required', 'string', 'max:200'],
        ]);

        $usuario = User::query()->where('email', strtolower(trim($dados['email'])))->first();

        if (! $usuario || ! Hash::check($dados['senha'], $usuario->password)) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        if (! $usuario->ativo) {
            throw ValidationException::withMessages(['email' => 'Seu usuário está desativado.']);
        }

        $token = $usuario->createToken('painel', ['*'], now()->addHours(12));

        return response()->json([
            'token' => $token->plainTextToken,
            'expira_em' => $token->accessToken->expires_at?->toIso8601String(),
            'usuario' => new UsuarioResource($usuario),
        ]);
    }

    public function eu(Request $request): UsuarioResource
    {
        return new UsuarioResource($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sessão encerrada.']);
    }
}
