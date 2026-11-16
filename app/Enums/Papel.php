<?php

namespace App\Enums;

enum Papel: string
{
    use ListaOpcoes;

    case Administrador = 'administrador';
    case Cardapio = 'cardapio';
    case Atendimento = 'atendimento';
    case Leitura = 'leitura';

    public function rotulo(): string
    {
        return match ($this) {
            self::Administrador => 'Administrador',
            self::Cardapio => 'Cardápio',
            self::Atendimento => 'Atendimento',
            self::Leitura => 'Somente leitura',
        };
    }

    /**
     * O que cada papel pode fazer no painel.
     * Ver também os Gates em AppServiceProvider.
     *
     * @return list<string>
     */
    public function permissoes(): array
    {
        return match ($this) {
            self::Administrador => ['cardapio', 'pedidos', 'caixa', 'usuarios', 'configuracoes'],
            self::Cardapio => ['cardapio'],
            self::Atendimento => ['pedidos', 'caixa'],
            self::Leitura => [],
        };
    }

    public function pode(string $permissao): bool
    {
        return in_array($permissao, $this->permissoes(), true);
    }
}
