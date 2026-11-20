<?php

namespace App\Services;

use App\Models\Cliente;
use App\Models\Configuracao;
use App\Models\Pedido;
use Illuminate\Validation\ValidationException;

// a cada pedido o cliente ganha um selo; juntando a meta, troca por um desconto
class FidelidadeService
{
    public function ativa(): bool
    {
        return Configuracao::valor('fidelidade_ativa') === '1';
    }

    public function meta(): int
    {
        return max(1, Configuracao::inteiro('fidelidade_meta'));
    }

    public function premio(): float
    {
        return round((float) Configuracao::valor('fidelidade_premio', '0'), 2);
    }

    public function regras(): array
    {
        return ['ativa' => $this->ativa(), 'meta' => $this->meta(), 'premio' => $this->premio()];
    }

    // o que o totem mostra quando o cliente digita o celular
    public function consultar(string $telefone): array
    {
        $numero = $this->telefoneValido($telefone);
        $selos = Cliente::query()->where('telefone', $numero)->value('selos') ?? 0;

        return [
            ...$this->regras(),
            'selos' => $selos,
            'pode_resgatar' => $selos >= $this->meta(),
        ];
    }

    // chamado dentro da transação do pedido, com o cliente travado
    public function clienteDoPedido(?string $telefone): ?Cliente
    {
        if (! $this->ativa() || $telefone === null || trim($telefone) === '') {
            return null;
        }

        $numero = $this->telefoneValido($telefone);

        Cliente::query()->firstOrCreate(['telefone' => $numero]);

        return Cliente::query()->where('telefone', $numero)->lockForUpdate()->first();
    }

    public function descontoDoResgate(?Cliente $cliente, float $subtotal): float
    {
        if (! $cliente || $cliente->selos < $this->meta()) {
            throw ValidationException::withMessages(['telefone' => 'Ainda faltam selos para o prêmio do cartão fidelidade.']);
        }

        return round(min($this->premio(), $subtotal), 2);
    }

    // pedido que resgata o prêmio não ganha selo
    public function registrar(Cliente $cliente, bool $resgatou): void
    {
        if ($resgatou) {
            $cliente->selos -= $this->meta();
            $cliente->resgates++;
        } else {
            $cliente->selos++;
        }

        $cliente->ultimo_pedido_em = now();
        $cliente->save();
    }

    public function desfazer(Pedido $pedido): void
    {
        $cliente = Cliente::query()->lockForUpdate()->find($pedido->cliente_id);

        if (! $cliente) {
            return;
        }

        if ($pedido->fidelidade_resgate) {
            $cliente->selos += $this->meta();
            $cliente->resgates = max(0, $cliente->resgates - 1);
        } else {
            $cliente->selos = max(0, $cliente->selos - 1);
        }

        $cliente->save();
    }

    private function telefoneValido(string $telefone): string
    {
        return Cliente::normalizarTelefone($telefone)
            ?? throw ValidationException::withMessages(['telefone' => 'Confira o celular com DDD, por exemplo (11) 98765-4321.']);
    }
}
