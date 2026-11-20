<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SalvarCupomRequest;
use App\Http\Resources\CupomResource;
use App\Models\Cupom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CupomController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return CupomResource::collection(Cupom::query()->orderByDesc('ativo')->orderBy('codigo')->get());
    }

    public function store(SalvarCupomRequest $request): JsonResponse
    {
        $cupom = Cupom::query()->create($request->validated());

        return (new CupomResource($cupom))->response()->setStatusCode(201);
    }

    public function update(SalvarCupomRequest $request, Cupom $cupom): CupomResource
    {
        $cupom->update($request->validated());

        return new CupomResource($cupom);
    }

    // cupom que já foi usado fica no histórico dos pedidos, então só desativa
    public function destroy(Cupom $cupom): JsonResponse
    {
        if ($cupom->usos > 0) {
            $cupom->update(['ativo' => false]);

            return response()->json(['message' => 'Este cupom já foi usado, então foi desativado em vez de excluído.']);
        }

        $cupom->delete();

        return response()->json(['message' => 'Cupom excluído.']);
    }
}
