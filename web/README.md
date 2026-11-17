# GastroTech · Web

Front em Angular: totem, cozinha e painel.

## Rodar

Precisa do Node.js e da [api](../api/README.md) rodando antes.

```bash
npm install
npm start
```

Abre http://localhost:4200. Dali dá pra escolher totem, cozinha ou painel.

O endereço da api fica em `src/app/config.ts`.

## Telas

- **totem** (`/#/totem`): cardápio, personalização, pagamento e acompanhamento do pedido. Se ninguém mexer por 90 segundos, volta pro começo
- **cozinha** (`/#/cozinha`): fila de pedidos que atualiza a cada 5 segundos
- **painel** (`/#/painel`): visão geral, pedidos, cardápio, financeiro, equipe e configurações

A cozinha e o painel pedem login. Cada papel só vê o que é da função dele.

## Visual

Preto e branco igual a logo, com laranja só nos botões e no que precisa chamar atenção. As fontes são Archivo e Monoton (só no código do pedido).

## Pastas

```
src/app/core/      sessão, carrinho, chamadas pra api
src/app/shared/    peças usadas em mais de uma tela
src/app/totem/     telas do totem
src/app/cozinha/   tela da cozinha
src/app/painel/    painel
src/app/entrar/    login
```
