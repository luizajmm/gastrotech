# GastroTech · API

Back-end do GastroTech em **Laravel 12**: totem de pedidos, cozinha e painel administrativo.
Esta é a nova versão do sistema que antes era feito em PHP puro.

O front-end (Angular) é um projeto separado que consome esta API.

## O que mudou em relação à versão antiga

| Antes | Agora |
|---|---|
| Exclusão por link (`?excluir=3`) | Exclusão só por `DELETE`, com login por token |
| Permissões salvas mas não usadas | Cada papel só faz o que pode (veja a tabela abaixo) |
| Upload confiava no tipo que o navegador informava | O conteúdo real do arquivo é conferido |
| Código do pedido com `MAX(id) + 1` (podia repetir) | Código gerado a partir do id, depois de salvar |
| Usuário novo sem senha ganhava "123" | Senha obrigatória (mínimo 6 caracteres) |
| Pedido em dinheiro já nascia "pago" | Fica pendente até o caixa confirmar |
| Estoque podia ser vendido duas vezes ao mesmo tempo | Estoque travado durante a criação do pedido |
| Personalizações em texto (`A: x, y \| B: z`) | JSON estruturado, validado no pedido |
| Cozinha só atualizava recarregando a página | A cozinha busca os pedidos sozinha a cada 5 segundos |

## Requisitos

- **XAMPP** (usamos só o MySQL dele, e o PHP se estiver no `C:\xampp\php`)
- **PHP 8.2 ou mais novo** (o do XAMPP 8.2 serve)
- **Composer**: https://getcomposer.org/download/
- **Node.js 20+** (para o front-end Angular): https://nodejs.org

## Instalação (uma vez só)

1. Abra o XAMPP e ligue o **MySQL**.
2. No phpMyAdmin (http://localhost/phpmyadmin), crie um banco chamado **`gastrotech`**
   (agrupamento `utf8mb4_unicode_ci`).
3. Dê dois cliques em **`instalar.bat`**.

O instalador baixa as dependências, cria o arquivo `.env`, monta as tabelas e carrega os dados de
demonstração (cardápio original, usuários e uma semana de vendas para os gráficos).

> Sem Windows? Rode `composer setup` no terminal.

## Rodar o sistema

Dê dois cliques em **`iniciar.bat`**. A API sobe em http://127.0.0.1:8000. Para parar, feche a janela.

> Sem Windows? Rode `composer dev`.

## Usuários de demonstração

Senha de todos: **`gastrotech`**

| E-mail | Papel | Pode |
|---|---|---|
| admin@gastrotech.com | Administrador | Tudo |
| cardapio@gastrotech.com | Cardápio | Produtos e categorias |
| atendimento@gastrotech.com | Atendimento | Cozinha (avançar/cancelar/pagamento) e caixa |
| leitura@gastrotech.com | Somente leitura | Ver tudo, sem alterar nada |

Todos os usuários logados podem **consultar** o painel. As permissões controlam quem pode **alterar**.

## Testes automatizados

```bash
php artisan test
```

Os testes usam um banco SQLite em memória (não mexem no MySQL) e cobrem: criação de pedido, preço vindo do
banco, estoque, personalizações, fluxo da cozinha, cancelamento, caixa, relatório de vendas, permissões de
cada papel, uploads e regras de usuários.

## Estrutura

```
app/
  Enums/          Status do pedido, formas de pagamento, papéis... (com os textos em português)
  Http/
    Controllers/Api/   Um controller por área
    Requests/          Validação de tudo que chega
    Resources/         Formato do JSON que o Angular recebe
  Models/         Tabelas do banco
  Services/       Regras de negócio (PedidoService, FinanceiroService)
database/
  migrations/     Criação das tabelas
  seeders/        Dados de demonstração e imagens originais
routes/
  api.php         Todas as rotas da API
tests/Feature/    Testes automatizados
```

## Rotas da API

Todas começam com `/api`. As do painel precisam do cabeçalho `Authorization: Bearer <token>`.

### Públicas (totem)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/totem/cardapio` | Dados da loja + categorias com produtos disponíveis |
| POST | `/totem/pedidos` | Cria o pedido |
| GET | `/totem/pedidos/{codigo}` | Acompanhamento do pedido pelo cliente |
| GET | `/opcoes` | Listas para selects (status, formas de pagamento, papéis...) |
| POST | `/login` | `{email, senha}` → `{token, usuario}` |

Exemplo de pedido:

```json
{
  "nome_cliente": "Ana",
  "forma_pagamento": "pix",
  "totem": "TOTEM-01",
  "itens": [
    { "produto_id": 1, "quantidade": 2, "personalizacoes": { "Bebida do combo": "Guaraná", "Gelo": "Sem gelo" }, "observacao": "Sem cebola" },
    { "produto_id": 3, "quantidade": 1 }
  ]
}
```

### Painel

| Método | Rota | Permissão |
|---|---|---|
| GET | `/eu` · POST `/logout` | logado |
| GET | `/dashboard` | logado |
| GET | `/categorias` · `/categorias/{id}` | logado |
| POST/PUT/DELETE | `/categorias` · `/categorias/{id}` | cardapio |
| GET | `/produtos?busca=&categoria_id=&situacao=` · `/produtos/{id}` | logado |
| POST/PUT/DELETE | `/produtos` · `/produtos/{id}` | cardapio |
| POST/DELETE | `/produtos/{id}/imagem` (campo `imagem`) | cardapio |
| GET | `/pedidos?status=ativos\|todos\|recebido...&busca=` · `/pedidos/{id}` | logado |
| POST | `/pedidos/{id}/avancar` · `/cancelar` · `/pagamento` | pedidos |
| GET | `/financeiro/vendas?data_inicio=&data_fim=&forma_pagamento=` | logado |
| GET | `/financeiro/caixa` · `/financeiro/caixas` · `/financeiro/movimentos` | logado |
| POST | `/financeiro/caixa/abrir` · `/caixa/fechar` · `/movimentos` | caixa |
| GET/POST/PUT/DELETE | `/usuarios` · `/usuarios/{id}` | usuarios |
| GET | `/configuracoes` · `/totens` | logado |
| PUT | `/configuracoes` · POST `/configuracoes/logo` (campo `imagem`) | configuracoes |
| POST/PUT/DELETE | `/totens` · `/totens/{id}` | configuracoes |

## Problemas comuns

- **"could not find driver"**: no `C:\xampp\php\php.ini`, tire o `;` da linha `extension=pdo_mysql`.
- **"The zip extension and unzip/7z commands are both missing"**: no mesmo `php.ini`, tire o `;` de `extension=zip`.
- **Erro de upload / imagem**: confira se `extension=fileinfo` e `extension=gd` estão ativos no `php.ini`.
- **Imagens não aparecem**: confira se existe a pasta `public/storage` com as subpastas `produtos` e `marca`. Se não existir, rode o `instalar.bat` de novo.
- **"Unknown database 'gastrotech'"**: crie o banco no phpMyAdmin (passo 2 da instalação).
- **Porta 8000 em uso**: feche o outro programa que está usando a porta, ou ajuste `APP_URL` no `.env`.
