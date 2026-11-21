# Banco de dados

MySQL, criado pelas migrations em `api/database/migrations`.

```mermaid
erDiagram
    categorias ||--o{ produtos : tem
    produtos |o--o{ itens_pedido : "aparece em"
    pedidos ||--|{ itens_pedido : tem
    totens |o--o{ pedidos : "feito no"
    users |o--o{ caixas : "abre e fecha"
    caixas ||--o{ movimentos_caixa : tem
    users |o--o{ movimentos_caixa : registra
    cupons |o--o{ pedidos : "usado em"
    clientes |o--o{ pedidos : "junta selos"
    produtos ||--o{ produto_insumo : "ficha técnica"
    insumos ||--o{ produto_insumo : "vai em"

    categorias {
        id bigint PK
        nome varchar
        descricao varchar
        icone varchar
        ordem int
        ativo boolean
    }
    produtos {
        id bigint PK
        categoria_id bigint FK
        nome varchar
        descricao varchar
        personalizacoes json
        imagem varchar
        estoque int
        preco decimal
        tempo_preparo_min int
        destaque boolean
        ativo boolean
    }
    totens {
        id bigint PK
        codigo varchar
        localizacao varchar
        status varchar
    }
    pedidos {
        id bigint PK
        totem_id bigint FK
        codigo varchar
        nome_cliente varchar
        status varchar
        status_pagamento varchar
        forma_pagamento varchar
        consumo varchar
        subtotal decimal
        desconto decimal
        total decimal
        cupom_id bigint FK
        cliente_id bigint FK
        avaliacao tinyint
        pago_em timestamp
        pronto_em timestamp
        finalizado_em timestamp
    }
    itens_pedido {
        id bigint PK
        pedido_id bigint FK
        produto_id bigint FK
        nome_produto varchar
        personalizacoes json
        observacao varchar
        quantidade int
        preco_unitario decimal
    }
    users {
        id bigint PK
        name varchar
        email varchar
        password varchar
        papel varchar
        ativo boolean
    }
    caixas {
        id bigint PK
        saldo_inicial decimal
        saldo_final decimal
        status varchar
        aberto_por bigint FK
        fechado_por bigint FK
        aberto_em timestamp
        fechado_em timestamp
    }
    movimentos_caixa {
        id bigint PK
        caixa_id bigint FK
        user_id bigint FK
        tipo varchar
        descricao varchar
        valor decimal
    }
    cupons {
        id bigint PK
        codigo varchar
        tipo varchar
        valor decimal
        pedido_minimo decimal
        validade date
        limite_usos int
        usos int
        ativo boolean
    }
    clientes {
        id bigint PK
        telefone varchar
        selos int
        resgates int
    }
    insumos {
        id bigint PK
        nome varchar
        unidade varchar
        estoque decimal
        estoque_minimo decimal
    }
    produto_insumo {
        produto_id bigint FK
        insumo_id bigint FK
        quantidade decimal
    }
    configuracoes {
        chave varchar PK
        valor text
    }
```

Os produtos também têm `destaques`, `ingredientes`, `tags`, `alergenos`, `porcao` e `calorias`, que só aparecem no totem. Tirei do desenho pra não ficar enorme.

As tabelas do próprio Laravel (`sessions`, `personal_access_tokens`, `cache`, `jobs`...) ficaram de fora.

## Por que ficou assim

- **o item guarda o nome e o preço do produto.** Se alguém mudar o preço depois, o histórico dos pedidos antigos não muda
- **apagar uma categoria não apaga os produtos.** Eles só ficam sem categoria (`nullOnDelete`)
- **apagar um produto ou um totem não apaga os pedidos.** O pedido continua no histórico e no financeiro
- **pedido nunca é apagado, só cancelado.** Senão o caixa e os relatórios param de bater
- **o `codigo` do pedido (A101, A102...) é gerado depois de salvar, a partir do id.** Na versão antiga era `MAX(id) + 1` e repetia quando dois totens pediam ao mesmo tempo
- **o status do pedido e do pagamento são separados.** Um pedido pode estar pronto e ainda não pago (dinheiro no balcão)
- **as personalizações são json.** Cada produto tem as suas (bebida do combo, ponto da carne, gelo...), então não fazia sentido uma tabela pra cada
- **`subtotal` é a soma dos itens e `total` é o que o cliente pagou.** O financeiro soma o `total`, então desconto de cupom ou do cartão fidelidade já sai do faturamento
- **o pedido guarda o código do cupom além do `cupom_id`.** Se o cupom for apagado, o histórico continua mostrando qual foi usado. Cupom que já foi usado não é apagado, só desativado
- **o cartão fidelidade só guarda o celular.** Sem nome, sem CPF; no painel o número aparece escondido
- **insumo tem estoque decimal** porque bacon é em gramas e sorvete em ml. O produto continua com o estoque próprio dele (bebida em lata, por exemplo), e o totem mostra o menor dos dois
- **`configuracoes` é chave/valor** pra dar pra adicionar coisa nova (nome da loja, frase do totem, logo) sem mexer na estrutura
