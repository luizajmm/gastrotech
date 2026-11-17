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

    // o que cada papel pode fazer no painel
    // ver também os Gates em AppServiceProvider
    public function permissoes(): array
    {
        return match ($this) {
            self::Administrador => ['cardapio', 'pedidos', 'caixa', 'usuarios', 'configuracoes'],
            self::Cardapio => ['cardapio'],
            self::Atendimento => ['pedidos', 'caixa'],
            self::Leitura => [],
        };
    }

    // o que cada papel pode ver no painel (somente leitura vê tudo menos a equipe)
    public function areas(): array
    {
        return match ($this) {
            self::Administrador => ['cardapio', 'pedidos', 'caixa', 'usuarios', 'configuracoes'],
            self::Cardapio => ['cardapio'],
            self::Atendimento => ['pedidos', 'caixa'],
            self::Leitura => ['cardapio', 'pedidos', 'caixa', 'configuracoes'],
        };
    }

    public function podeVer(string $area): bool
    {
        return in_array($area, $this->areas(), true);
    }

    public function pode(string $permissao): bool
    {
        return in_array($permissao, $this->permissoes(), true);
    }
}
