<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SalvarInsumoRequest;
use App\Http\Resources\InsumoResource;
use App\Models\Insumo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class InsumoController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return InsumoResource::collection(Insumo::query()->with('produtos:id,nome')->orderBy('nome')->get());
    }

    public function store(SalvarInsumoRequest $request): JsonResponse
    {
        $insumo = Insumo::query()->create($request->validated());

        return (new InsumoResource($insumo->load('produtos:id,nome')))->response()->setStatusCode(201);
    }

    public function update(SalvarInsumoRequest $request, Insumo $insumo): InsumoResource
    {
        $insumo->update($request->validated());

        return new InsumoResource($insumo->load('produtos:id,nome'));
    }

    // chegou mercadoria: soma no estoque sem precisar fazer a conta
    public function entrada(Request $request, Insumo $insumo): InsumoResource
    {
        $dados = $request->validate(['quantidade' => ['required', 'numeric', 'gt:0', 'max:9999999']]);
        $insumo->increment('estoque', $dados['quantidade']);

        return new InsumoResource($insumo->fresh()->load('produtos:id,nome'));
    }

    public function destroy(Insumo $insumo): JsonResponse
    {
        if ($insumo->produtos()->exists()) {
            throw ValidationException::withMessages([
                'insumo' => 'Este insumo está na ficha de algum produto. Tire ele de lá antes de excluir.',
            ]);
        }

        $insumo->delete();

        return response()->json(['message' => 'Insumo excluído.']);
    }
}
