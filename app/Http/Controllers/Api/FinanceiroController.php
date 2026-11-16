<?php

namespace App\Http\Controllers\Api;

use App\Enums\FormaPagamento;
use App\Http\Controllers\Controller;
use App\Http\Requests\FiltroPeriodoRequest;
use App\Http\Requests\MovimentoCaixaRequest;
use App\Http\Resources\CaixaResource;
use App\Http\Resources\MovimentoCaixaResource;
use App\Models\Caixa;
use App\Services\FinanceiroService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class FinanceiroController extends Controller
{
    public function __construct(private FinanceiroService $financeiro) {}

    // relatório de vendas do período (padrão: últimos 7 dias)
    public function vendas(FiltroPeriodoRequest $request): JsonResponse
    {
        return response()->json([
            'data' => $this->financeiro->vendas($request->inicio(), $request->fim(), $request->forma()),
        ]);
    }

    // caixa aberto agora, com o saldo esperado na gaveta
    public function caixa(): JsonResponse
    {
        $caixa = Caixa::aberto()?->load('abertoPor');

        return response()->json([
            'data' => $caixa ? [
                'caixa' => new CaixaResource($caixa),
                'resumo' => $this->financeiro->resumoCaixa($caixa),
            ] : null,
        ]);
    }

    public function abrirCaixa(Request $request): JsonResponse
    {
        $dados = $request->validate(['saldo_inicial' => ['required', 'numeric', 'min:0', 'max:99999']]);
        $caixa = $this->financeiro->abrirCaixa((float) $dados['saldo_inicial'], $request->user());

        return response()->json([
            'data' => [
                'caixa' => new CaixaResource($caixa->load('abertoPor')),
                'resumo' => $this->financeiro->resumoCaixa($caixa),
            ],
        ], 201);
    }

    public function fecharCaixa(Request $request): JsonResponse
    {
        $caixa = $this->financeiro->fecharCaixa($request->user());

        return response()->json([
            'data' => [
                'caixa' => new CaixaResource($caixa->load(['abertoPor', 'fechadoPor'])),
                'resumo' => $this->financeiro->resumoCaixa($caixa),
            ],
        ]);
    }

    public function historicoCaixas(): AnonymousResourceCollection
    {
        return CaixaResource::collection(
            Caixa::query()->with(['abertoPor', 'fechadoPor'])->latest('aberto_em')->paginate(15)
        );
    }

    // movimentos (entradas/saídas manuais) do caixa aberto
    public function movimentos(): AnonymousResourceCollection
    {
        $caixa = Caixa::aberto();

        return MovimentoCaixaResource::collection(
            $caixa ? $caixa->movimentos()->with('usuario')->latest()->get() : collect()
        );
    }

    public function registrarMovimento(MovimentoCaixaRequest $request): JsonResponse
    {
        $caixa = Caixa::aberto();

        if (! $caixa) {
            throw ValidationException::withMessages(['caixa' => 'Abra o caixa antes de registrar movimentos.']);
        }

        $movimento = $caixa->movimentos()->create([
            ...$request->validated(),
            'forma_pagamento' => $request->input('forma_pagamento', FormaPagamento::Dinheiro->value),
            'user_id' => $request->user()->id,
        ]);

        return (new MovimentoCaixaResource($movimento->load('usuario')))->response()->setStatusCode(201);
    }
}
