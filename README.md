# GastroTech · Web

Front-end do GastroTech em **Angular**: totem de autoatendimento, tela da cozinha e painel administrativo.

## Rodar

Precisa do **Node.js 22** (https://nodejs.org, versão LTS).

```bash
npm install
npm start
```

| Tela | Endereço |
|---|---|
| Totem | http://localhost:4200/#/totem |
| Cozinha | http://localhost:4200/#/cozinha |
| Painel | http://localhost:4200/#/painel |
| Login da equipe | http://localhost:4200/#/entrar |

## Antes de abrir

O front precisa da API (`gastrotech-api`) rodando. Rode o `iniciar.bat` da API antes. O endereço dela fica em `src/app/config.ts`. A cozinha e o painel pedem login, os usuários de teste estão no README da API.

## Telas

### Totem
Início, cardápio por categoria, ficha do produto com personalizações, revisão do pedido, pagamento, código de retirada com o andamento atualizado a cada 5 segundos e tela para acompanhar pelo código. Volta ao início sozinho após 90 segundos sem toque.

### Cozinha
Três colunas (Recebidos, Em preparo, Prontos), cronômetro com aviso de atraso, observações destacadas, confirmação de pagamento em dinheiro e cancelamento com confirmação. A fila atualiza sozinha a cada 5 segundos.

### Painel
| Página | O que faz | Quem altera |
|---|---|---|
| Visão geral | Faturamento e pedidos de hoje, vendas da semana, mais vendidos, atrasados, estoque baixo | — |
| Pedidos | Histórico com filtro por situação e busca por código ou cliente | — |
| Cardápio | Produtos (foto, preço, estoque, personalizações) e categorias | Cardápio, Administrador |
| Financeiro | Vendas por período e forma de pagamento; abrir/fechar caixa, entradas e saídas | Atendimento, Administrador |
| Equipe | Pessoas, permissões e acesso | Administrador |
| Configurações | Nome, frase e logo da loja; totens | Administrador |

Quem não tem a permissão vê a página, mas sem os botões de alterar. A página Equipe só aparece para administradores.

## Identidade visual

- Preto e branco como a logo, com **laranja brasa** só no que importa: botões de ação, total e destaques.
- **Traço triplo** da logo marca o que está selecionado, pedidos novos na cozinha e a soma do caixa.
- Tipografia: **Archivo** em largura normal e **Monoton** só no código de retirada. As fontes vêm junto com o app.

## Estrutura

```
src/app/
  config.ts            Endereço da API e código do totem
  core/                Modelos, sessão, carrinho, chamadas pra API, avisos
  shared/              Peças reaproveitadas (ícones, formato de dinheiro, cabeçalho)
  totem/               Telas do totem
  cozinha/             Tela da cozinha
  painel/              Painel administrativo
  entrar/              Login da equipe
src/styles.css         Cores, tipografia e botões
src/painel.css         Formulários, tabelas e janelas do painel
public/                Logo e ícone
```
