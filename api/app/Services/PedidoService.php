<?php

namespace App\Services;

use App\Enums\Consumo;
use App\Enums\FormaPagamento;
use App\Enums\StatusPagamento;
use App\Enums\StatusPedido;
use App\Models\Cupom;
use App\Models\Insumo;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\Totem;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PedidoService
{
    public function __construct(private FidelidadeService $fidelidade) {}

    // o preço vem sempre do banco, e o estoque fica travado na transação
    // pra dois totens não venderem a última unidade juntos
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
            $this->baixarInsumos($linhas);
            $subtotal = round($linhas->sum(fn ($l) => (float) $l['produto']->preco * $l['quantidade']), 2);
            $cupom = $this->cupom($dados['cupom'] ?? null, $subtotal);
            $desconto = $cupom?->descontoPara($subtotal) ?? 0.0;

            $cliente = $this->fidelidade->clienteDoPedido($dados['telefone'] ?? null);
            $resgate = $cliente !== null && ! empty($dados['resgatar_premio']);

            if ($resgate) {
                if ($cupom) {
                    throw ValidationException::withMessages(['cupom' => 'Use o cupom ou o prêmio do cartão fidelidade, os dois juntos não dá.']);
                }
                $desconto = $this->fidelidade->descontoDoResgate($cliente, $subtotal);
            }

            $pedido = Pedido::query()->create([
                'totem_id' => $this->totem($dados['totem'] ?? null)?->id,
                'cliente_id' => $cliente?->id,
                'fidelidade_resgate' => $resgate,
                'nome_cliente' => trim((string) ($dados['nome_cliente'] ?? '')) ?: 'Cliente',
                'status' => StatusPedido::Recebido,
                'status_pagamento' => $forma->pagoNoTotem() ? StatusPagamento::Pago : StatusPagamento::Pendente,
                'forma_pagamento' => $forma,
                'consumo' => $dados['consumo'] ?? Consumo::Local->value,
                'pago_em' => $forma->pagoNoTotem() ? now() : null,
                'subtotal' => $subtotal,
                'desconto' => $desconto,
                'total' => round($subtotal - $desconto, 2),
                'cupom_id' => $cupom?->id,
                'cupom_codigo' => $cupom?->codigo,
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

            $cupom?->increment('usos');
            if ($cliente) {
                $this->fidelidade->registrar($cliente, $resgate);
            }
            $pedido->update(['codigo' => Pedido::gerarCodigo($pedido->id)]);

            return $pedido;
        });


        return $pedido->load(['itens', 'totem']);
    }

    // recebido > em preparo > pronto > retirado
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

    // devolve pro estoque
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

            // os insumos voltam pela ficha de agora (se mudaram a ficha no meio, a volta é aproximada)
            $ficha = DB::table('produto_insumo')->whereIn('produto_id', $pedido->itens->pluck('produto_id')->filter())->get();
            foreach ($pedido->itens as $item) {
                foreach ($ficha->where('produto_id', $item->produto_id) as $linha) {
                    Insumo::query()->whereKey($linha->insumo_id)->increment('estoque', (float) $linha->quantidade * $item->quantidade);
                }
            }

            // o uso do cupom volta, senão um cancelamento gasta o limite
            if ($pedido->cupom_id) {
                Cupom::query()->whereKey($pedido->cupom_id)->where('usos', '>', 0)->decrement('usos');
            }

            // e o selo (ou o prêmio) do cartão fidelidade também
            if ($pedido->cliente_id) {
                $this->fidelidade->desfazer($pedido);
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

    // junta todos os erros numa resposta só pro totem mostrar
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

    // soma o que o pedido gasta de cada insumo, trava e confere antes de baixar
    private function baixarInsumos(Collection $linhas): void
    {
        $ficha = DB::table('produto_insumo')->whereIn('produto_id', $linhas->map(fn ($l) => $l['produto']->id))->get();

        if ($ficha->isEmpty()) {
            return;
        }

        $insumos = Insumo::query()->whereIn('id', $ficha->pluck('insumo_id')->unique())->lockForUpdate()->get()->keyBy('id');
        $precisa = [];
        $produtoDo = [];

        foreach ($linhas as $linha) {
            foreach ($ficha->where('produto_id', $linha['produto']->id) as $item) {
                $precisa[$item->insumo_id] = ($precisa[$item->insumo_id] ?? 0) + (float) $item->quantidade * $linha['quantidade'];
                $produtoDo[$item->insumo_id] ??= $linha['produto']->nome;
            }
        }

        $erros = [];
        foreach ($precisa as $id => $quantidade) {
            if ((float) $insumos[$id]->estoque + 1e-9 < $quantidade) {
                $erros["itens.insumo_{$id}"] = "{$produtoDo[$id]} acabou por agora (faltou {$insumos[$id]->nome}).";
            }
        }

        if ($erros) {
            throw ValidationException::withMessages($erros);
        }

        foreach ($precisa as $id => $quantidade) {
            $insumos[$id]->decrement('estoque', $quantidade);
        }
    }

    // usado pelo totem pra mostrar o desconto antes de pagar
    public function conferirCupom(string $codigo, float $subtotal): Cupom
    {
        $cupom = Cupom::query()->where('codigo', Cupom::normalizar($codigo))->first();

        if (! $cupom) {
            throw ValidationException::withMessages(['cupom' => 'Não encontramos esse cupom. Confira as letras.']);
        }

        if ($problema = $cupom->problemaPara($subtotal)) {
            throw ValidationException::withMessages(['cupom' => $problema]);
        }

        return $cupom;
    }

    // dentro da transação: trava o cupom pra dois totens não passarem do limite juntos
    private function cupom(?string $codigo, float $subtotal): ?Cupom
    {
        if ($codigo === null || trim($codigo) === '') {
            return null;
        }

        Cupom::query()->where('codigo', Cupom::normalizar($codigo))->lockForUpdate()->first();

        return $this->conferirCupom($codigo, $subtotal);
    }

    private function totem(?string $codigo): ?Totem
    {
        if ($codigo) {
            return Totem::query()->where('codigo', $codigo)->first();
        }

        return Totem::query()->orderBy('id')->first();
    }
}
