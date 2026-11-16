<?php

namespace App\Http\Controllers\Api;

use App\Enums\FormaPagamento;
use App\Enums\Papel;
use App\Enums\StatusPagamento;
use App\Enums\StatusPedido;
use App\Enums\StatusTotem;
use App\Enums\TipoMovimento;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * Listas usadas nos selects do front-end (evita repetir os textos no Angular).
 */
class OpcoesController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => [
                'papeis' => Papel::opcoes(),
                'status_pedido' => StatusPedido::opcoes(),
                'status_pagamento' => StatusPagamento::opcoes(),
                'formas_pagamento' => FormaPagamento::opcoes(),
                'tipos_movimento' => TipoMovimento::opcoes(),
                'status_totem' => StatusTotem::opcoes(),
            ],
        ]);
    }
}
