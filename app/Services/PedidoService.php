<?php

namespace App\Services;

use App\Enums\FormaPagamento;
use App\Enums\StatusPagamento;
use App\Enums\StatusPedido;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\Totem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PedidoService
{
    // cria o pedido vindo do totem
    // o preço sempre vem do banco (o carrinho só manda id e quantidade),
    // e o estoque é travado durante a transação para dois totens não
    // venderem a última unidade ao mesmo tempo
    public function criar(array $dados): Pedido
    {
        $forma = FormaPagamento::from($dados['forma_pagamento']);

        $pedido = DB::transaction(function () use ($dados, $forma) {
            $itens = collect($dados['itens']);

            $produtos = Produto::query()
                ->whereIn('id', $itens->pluck('produto_id')->unique())
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $linhas = $this->validarItens($itens, $produtos);

            $pedido = Pedido::query()->create([
                'totem_id' => $this->totem($dados['totem'] ?? null)?->id,
                'nome_cliente' => trim((string) ($dados['nome_cliente'] ?? '')) ?: 'Cliente',
                'status' => StatusPedido::Recebido,
                'status_pagamento' => $forma->pagoNoTotem() ? StatusPagamento::Pago : StatusPagamento::Pendente,
                'forma_pagamento' => $forma,
                'pago_em' => $forma->pagoNoTotem() ? now() : null,
                'subtotal' => $linhas->sum(fn ($l) => (float) $l['produto']->preco * $l['quantidade']),
                'tempo_estimado_min' => (int) $linhas->max(fn ($l) => $l['produto']->tempo_preparo_min),
            ]);

            foreach ($linhas as $linha) {
                $pedido->itens()->create([
                    'produto_id' => $linha['produto']->id,
                    'nome_produto' => $linha['produto']->nome,
                    'personalizacoes' => $linha['personalizacoes'] ?: null,
                    'observacao' => $linha['observacao'],
                    'quantidade' => $linha['quantidade'],
                    'preco_unitario' => $linha['produto']->preco,
                ]);

                $linha['produto']->decrement('estoque', $linha['quantidade']);
            }

            $pedido->update(['codigo' => Pedido::gerarCodigo($pedido->id)]);

            return $pedido;
        });


        return $pedido->load(['itens', 'totem']);
    }

    // leva o pedido para a próxima etapa (Recebido → Em preparo → Pronto → Retirado)
    public function avancar(Pedido $pedido): Pedido
    {
        $pedido = DB::transaction(function () use ($pedido) {
            $pedido = Pedido::query()->lockForUpdate()->findOrFail($pedido->id);
            $proximo = $pedido->status->proximo();

            if ($proximo === null) {
                throw ValidationException::withMessages(['status' => 'Este pedido já foi encerrado.']);
            }

            if ($proximo === StatusPedido::Retirado && $pedido->status_pagamento !== StatusPagamento::Pago) {
                throw ValidationException::withMessages([
                    'status' => 'Confirme o pagamento antes de entregar o pedido.',
                ]);
            }

            $pedido->status = $proximo;
            $pedido->pronto_em = $proximo === StatusPedido::Pronto ? now() : $pedido->pronto_em;
            $pedido->finalizado_em = $proximo === StatusPedido::Retirado ? now() : null;
            $pedido->save();

            return $pedido;
        });


        return $pedido->load(['itens', 'totem']);
    }

    // cancela, devolve os itens ao estoque e estorna se já estava pago
    public function cancelar(Pedido $pedido): Pedido
    {
        $pedido = DB::transaction(function () use ($pedido) {
            $pedido = Pedido::query()->with('itens')->lockForUpdate()->findOrFail($pedido->id);

            if ($pedido->status->finalizado()) {
                throw ValidationException::withMessages(['status' => 'Este pedido já foi encerrado.']);
            }

            foreach ($pedido->itens as $item) {
                if ($item->produto_id) {
                    Produto::query()->whereKey($item->produto_id)->increment('estoque', $item->quantidade);
                }
            }

            $pedido->status = StatusPedido::Cancelado;
            $pedido->status_pagamento = $pedido->status_pagamento === StatusPagamento::Pago
                ? StatusPagamento::Estornado
                : StatusPagamento::Pendente;
            $pedido->finalizado_em = now();
            $pedido->save();

            return $pedido;
        });


        return $pedido->load(['itens', 'totem']);
    }

    // confirma pagamento feito no balcão (pedidos em dinheiro)
    public function confirmarPagamento(Pedido $pedido): Pedido
    {
        if ($pedido->status === StatusPedido::Cancelado) {
            throw ValidationException::withMessages(['status_pagamento' => 'Pedido cancelado não pode ser pago.']);
        }

        if ($pedido->status_pagamento !== StatusPagamento::Pago) {
            $pedido->update(['status_pagamento' => StatusPagamento::Pago, 'pago_em' => now()]);
        }

        return $pedido->load(['itens', 'totem']);
    }

    // confere disponibilidade, estoque e personalizações de cada item
    // junta todos os problemas numa única resposta para o totem mostrar
    private function validarItens(Collection $itens, Collection $produtos): Collection
    {
        $erros = [];
        $linhas = collect();
        $reservado = [];

        foreach ($itens->values() as $i => $item) {
            $produto = $produtos->get((int) $item['produto_id']);
            $campo = "itens.$i";

            if (! $produto || ! $produto->ativo) {
                $erros["$campo.produto_id"] = 'Este produto não está mais disponível.';

                continue;
            }

            $quantidade = (int) $item['quantidade'];
            $reservado[$produto->id] = ($reservado[$produto->id] ?? 0) + $quantidade;

            if ($reservado[$produto->id] > $produto->estoque) {
                $erros["$campo.quantidade"] = $produto->estoque > 0
                    ? "Só restam {$produto->estoque} unidade(s) de {$produto->nome}."
                    : "{$produto->nome} esgotou.";
            }

            $escolhas = $item['personalizacoes'] ?? [];

            foreach ($produto->gruposPersonalizacao() as $grupo) {
                $escolha = $escolhas[$grupo['nome']] ?? null;

                if ($escolha === null || $escolha === '') {
                    if ($grupo['obrigatorio']) {
                        $erros["$campo.personalizacoes"] = "Escolha \"{$grupo['nome']}\" para {$produto->nome}.";
                    }

                    continue;
                }

                if (! in_array($escolha, $grupo['opcoes'], true)) {
                    $erros["$campo.personalizacoes"] = "Opção inválida em \"{$grupo['nome']}\" para {$produto->nome}.";
                }
            }

            $gruposValidos = array_column($produto->gruposPersonalizacao(), 'nome');
            $escolhasValidas = array_filter(
                array_intersect_key($escolhas, array_flip($gruposValidos)),
                fn ($v) => $v !== null && $v !== '',
            );

            if (count($escolhas) !== count(array_intersect_key($escolhas, array_flip($gruposValidos)))) {
                $erros["$campo.personalizacoes"] ??= "{$produto->nome} não tem essa personalização.";
            }

            $linhas->push([
                'produto' => $produto,
                'quantidade' => $quantidade,
                'personalizacoes' => $escolhasValidas,
                'observacao' => trim((string) ($item['observacao'] ?? '')) ?: null,
            ]);
        }

        if ($erros) {
            throw ValidationException::withMessages($erros);
        }

        return $linhas;
    }

    private function totem(?string $codigo): ?Totem
    {
        if ($codigo) {
            return Totem::query()->where('codigo', $codigo)->first();
        }

        return Totem::query()->orderBy('id')->first();
    }
}
