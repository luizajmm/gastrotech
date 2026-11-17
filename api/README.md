# GastroTech · API

API em Laravel 12 que o totem, a cozinha e o painel usam.

## Instalar (só na primeira vez)

1. No XAMPP, liga o **MySQL**
2. No phpMyAdmin (http://localhost/phpmyadmin), cria um banco chamado `gastrotech`
3. Roda o `instalar.bat`

Ele instala as dependências, cria o `.env`, monta as tabelas e coloca dados de exemplo (cardápio, usuários e uma semana de vendas pros gráficos).

Fora do Windows: `composer setup`.

## Rodar

Roda o `iniciar.bat`. A API fica em http://127.0.0.1:8000.

Fora do Windows: `composer dev`.

## Usuários de teste

A senha de todos é `gastrotech`.

| E-mail | Papel | Vê |
|---|---|---|
| admin@gastrotech.com | Administrador | tudo |
| atendimento@gastrotech.com | Atendimento | cozinha, pedidos e financeiro |
| cardapio@gastrotech.com | Cardápio | cardápio |
| leitura@gastrotech.com | Somente leitura | tudo menos a equipe, sem alterar nada |

## Testes

```bash
php artisan test
```

Rodam num SQLite em memória, então não mexem no banco do XAMPP.

## Pastas

```
app/Enums/          status do pedido, formas de pagamento, papéis
app/Http/           controllers, validações (Requests) e formato do json (Resources)
app/Models/         tabelas
app/Services/       regras de pedido e do financeiro
database/           migrations e dados de exemplo
routes/api.php      todas as rotas
tests/Feature/      testes
```

## Rotas principais

Todas começam com `/api`. As da equipe precisam do token do login (`Authorization: Bearer ...`).

- totem (sem login): `GET /totem/cardapio`, `POST /totem/pedidos`, `GET /totem/pedidos/{codigo}`
- login: `POST /login` com `{email, senha}`
- cozinha: `GET /pedidos?status=ativos`, `POST /pedidos/{id}/avancar`, `/cancelar`, `/pagamento`
- painel: `/dashboard`, `/produtos`, `/categorias`, `/financeiro/...`, `/usuarios`, `/configuracoes`, `/totens`

## Se der erro

- **"could not find driver"**: no `C:\xampp\php\php.ini`, tira o `;` da linha `extension=pdo_mysql`
- **"The zip extension..."**: no mesmo arquivo, tira o `;` de `extension=zip`
- **erro no upload de imagem**: confere se `extension=fileinfo` e `extension=gd` estão ativas
- **imagens não aparecem**: roda `php artisan storage:link`
- **"Unknown database 'gastrotech'"**: falta criar o banco no phpMyAdmin
