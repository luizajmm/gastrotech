<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SalvarTotemRequest;
use App\Http\Resources\TotemResource;
use App\Models\Totem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** Cadastro dos totens (aparelhos) da loja. */
class TotensController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return TotemResource::collection(
            Totem::query()
                ->withCount(['pedidos' => fn ($q) => $q->whereDate('created_at', today())])
                ->orderBy('codigo')
                ->get()
        );
    }

    public function store(SalvarTotemRequest $request): JsonResponse
    {
        return (new TotemResource(Totem::query()->create($request->validated())))
            ->response()->setStatusCode(201);
    }

    public function update(SalvarTotemRequest $request, Totem $totem): TotemResource
    {
        $totem->update($request->validated());

        return new TotemResource($totem);
    }

    /** O histórico de pedidos do totem é mantido (o pedido fica sem totem). */
    public function destroy(Totem $totem): JsonResponse
    {
        $totem->delete();

        return response()->json(['message' => 'Totem removido.']);
    }
}
