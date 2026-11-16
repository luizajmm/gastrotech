<?php

namespace App\Http\Controllers\Api;

use App\Enums\Papel;
use App\Http\Controllers\Controller;
use App\Http\Requests\SalvarUsuarioRequest;
use App\Http\Resources\UsuarioResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class UsuarioController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return UsuarioResource::collection(User::query()->orderBy('name')->get());
    }

    public function store(SalvarUsuarioRequest $request): JsonResponse
    {
        $usuario = User::query()->create($this->dados($request));

        return (new UsuarioResource($usuario))->response()->setStatusCode(201);
    }

    public function show(User $usuario): UsuarioResource
    {
        return new UsuarioResource($usuario);
    }

    public function update(SalvarUsuarioRequest $request, User $usuario): UsuarioResource
    {
        $dados = $this->dados($request);
        $eu = $request->user()->is($usuario);

        if ($eu && (($dados['ativo'] ?? true) === false || (isset($dados['papel']) && $dados['papel'] !== Papel::Administrador->value))) {
            throw ValidationException::withMessages([
                'papel' => 'Você não pode desativar nem tirar a permissão de administrador de si mesmo.',
            ]);
        }

        $deixaDeSerAdmin = $usuario->ehAdministrador()
            && ((isset($dados['papel']) && $dados['papel'] !== Papel::Administrador->value) || ($dados['ativo'] ?? true) === false);

        if ($deixaDeSerAdmin && $this->ultimoAdministrador($usuario)) {
            throw ValidationException::withMessages(['papel' => 'O sistema precisa de pelo menos um administrador ativo.']);
        }

        $usuario->update($dados);

        // desativado ou com senha trocada: derruba as sessões abertas dele
        if (! $usuario->ativo || isset($dados['password'])) {
            $usuario->tokens()
                ->when($eu, fn ($q) => $q->whereKeyNot($request->user()->currentAccessToken()->id))
                ->delete();
        }

        return new UsuarioResource($usuario);
    }

    public function destroy(Request $request, User $usuario): JsonResponse
    {
        if ($request->user()->is($usuario)) {
            throw ValidationException::withMessages(['usuario' => 'Você não pode excluir o próprio usuário.']);
        }

        if ($usuario->ehAdministrador() && $this->ultimoAdministrador($usuario)) {
            throw ValidationException::withMessages(['usuario' => 'O sistema precisa de pelo menos um administrador ativo.']);
        }

        $usuario->tokens()->delete();
        $usuario->delete();

        return response()->json(['message' => 'Usuário excluído.']);
    }

    private function dados(SalvarUsuarioRequest $request): array
    {
        $validados = $request->validated();
        $dados = [];

        foreach (['email', 'papel', 'ativo'] as $campo) {
            if (array_key_exists($campo, $validados)) {
                $dados[$campo] = $validados[$campo];
            }
        }

        if (array_key_exists('nome', $validados)) {
            $dados['name'] = $validados['nome'];
        }

        if (! empty($validados['senha'])) {
            $dados['password'] = $validados['senha']; // cast "hashed" no model
        }

        if (array_key_exists('ativo', $dados)) {
            $dados['ativo'] = (bool) $dados['ativo'];
        }

        return $dados;
    }

    private function ultimoAdministrador(User $usuario): bool
    {
        return ! User::query()
            ->where('papel', Papel::Administrador)
            ->where('ativo', true)
            ->whereKeyNot($usuario->id)
            ->exists();
    }
}
