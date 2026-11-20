<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SalvarCupomRequest;
use App\Http\Resources\CupomResource;
use App\Enums\StatusPedido;
use App\Models\Cliente;
use App\Models\Cupom;
use App\Services\FidelidadeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CupomController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return CupomResource::collection(Cupom::query()->orderByDesc('ativo')->orderBy('codigo')->get());
    }

    // quem tem cartão fidelidade, com o celular mascarado
    public function clientes(FidelidadeService $fidelidade): JsonResponse
    {
        $clientes = Cliente::query()
            ->withCount(['pedidos' => fn ($q) => $q->where('status', '!=', StatusPedido::Cancelado)])
            ->orderByDesc('ultimo_pedido_em')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => [
                'regras' => $fidelidade->regras(),
                'total' => Cliente::query()->count(),
                'clientes' => $clientes->map(fn (Cliente $c) => [
                    'id' => $c->id,
                    'telefone' => $c->telefoneMascarado(),
                    'selos' => $c->selos,
                    'resgates' => $c->resgates,
                    'pedidos' => $c->pedidos_count,
                    'ultimo_pedido_em' => $c->ultimo_pedido_em?->toIso8601String(),
                ]),
            ],
        ]);
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
