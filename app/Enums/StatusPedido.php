<?php

namespace App\Enums;

enum StatusPedido: string
{
    use ListaOpcoes;

    case Recebido = 'recebido';
    case EmPreparo = 'em_preparo';
    case Pronto = 'pronto';
    case Retirado = 'retirado';
    case Cancelado = 'cancelado';

    public function rotulo(): string
    {
        return match ($this) {
            self::Recebido => 'Recebido',
            self::EmPreparo => 'Em preparo',
            self::Pronto => 'Pronto',
            self::Retirado => 'Retirado',
            self::Cancelado => 'Cancelado',
        };
    }

    // próxima etapa do fluxo da cozinha, ou null se o pedido já terminou
    public function proximo(): ?self
    {
        return match ($this) {
            self::Recebido => self::EmPreparo,
            self::EmPreparo => self::Pronto,
            self::Pronto => self::Retirado,
            self::Retirado, self::Cancelado => null,
        };
    }

    // pedido ainda está na fila da cozinha (conta para atraso)
    public function emProducao(): bool
    {
        return in_array($this, [self::Recebido, self::EmPreparo], true);
    }

    public function finalizado(): bool
    {
        return in_array($this, [self::Retirado, self::Cancelado], true);
    }

    public static function fluxo(): array
    {
        return [self::Recebido, self::EmPreparo, self::Pronto, self::Retirado];
    }

    public static function ativos(): array
    {
        return [self::Recebido, self::EmPreparo, self::Pronto];
    }
}
