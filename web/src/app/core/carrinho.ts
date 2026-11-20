import { computed, Injectable, signal } from '@angular/core';
import { Consumo, CupomAplicado, FormaPagamento, ItemNovoPedido, Produto } from './modelos';

export interface LinhaCarrinho {
  // mesmo lanche com escolhas diferentes fica em linhas separadas
  chave: string;
  produto: Produto;
  quantidade: number;
  personalizacoes: Record<string, string>;
  observacao: string;
}

@Injectable({ providedIn: 'root' })
export class Carrinho {
  private readonly _linhas = signal<LinhaCarrinho[]>([]);

  readonly linhas = this._linhas.asReadonly();
  readonly nomeCliente = signal('');
  readonly formaPagamento = signal<FormaPagamento | null>(null);
  readonly consumo = signal<Consumo>('local');

  readonly quantidadeItens = computed(() => this._linhas().reduce((s, l) => s + l.quantidade, 0));
  readonly total = computed(
    () => Math.round(this._linhas().reduce((s, l) => s + l.produto.preco * l.quantidade, 0) * 100) / 100,
  );
  readonly vazio = computed(() => this._linhas().length === 0);

  // o desconto é recalculado aqui quando o cliente mexe no pedido;
  // a api confere de novo na hora de criar
  readonly cupom = signal<CupomAplicado | null>(null);
  readonly cupomAbaixoDoMinimo = computed(() => {
    const c = this.cupom();
    return !!c && c.pedido_minimo !== null && this.total() < c.pedido_minimo;
  });
  readonly desconto = computed(() => {
    const c = this.cupom();
    if (!c || this.cupomAbaixoDoMinimo()) return 0;
    const bruto = c.tipo === 'percentual' ? (this.total() * c.valor) / 100 : c.valor;
    return Math.round(Math.min(bruto, this.total()) * 100) / 100;
  });
  readonly aPagar = computed(() => Math.round((this.total() - this.desconto()) * 100) / 100);

  quantidadeDo(produtoId: number): number {
    return this._linhas()
      .filter((l) => l.produto.id === produtoId)
      .reduce((s, l) => s + l.quantidade, 0);
  }

  adicionar(produto: Produto, quantidade: number, personalizacoes: Record<string, string>, observacao: string): void {
    const obs = observacao.trim();
    const chave = `${produto.id}|${JSON.stringify(Object.entries(personalizacoes).sort())}|${obs}`;

    this._linhas.update((linhas) => {
      const existente = linhas.find((l) => l.chave === chave);
      if (existente) {
        return linhas.map((l) => (l === existente ? { ...l, quantidade: l.quantidade + quantidade } : l));
      }
      return [...linhas, { chave, produto, quantidade, personalizacoes: { ...personalizacoes }, observacao: obs }];
    });
  }

  alterarQuantidade(chave: string, delta: number): void {
    this._linhas.update((linhas) =>
      linhas
        .map((l) => (l.chave === chave ? { ...l, quantidade: l.quantidade + delta } : l))
        .filter((l) => l.quantidade > 0),
    );
  }

  remover(chave: string): void {
    this._linhas.update((linhas) => linhas.filter((l) => l.chave !== chave));
  }

  itensParaApi(): ItemNovoPedido[] {
    return this._linhas().map((l) => ({
      produto_id: l.produto.id,
      quantidade: l.quantidade,
      personalizacoes: Object.keys(l.personalizacoes).length ? l.personalizacoes : undefined,
      observacao: l.observacao || null,
    }));
  }

  limpar(): void {
    this._linhas.set([]);
    this.nomeCliente.set('');
    this.formaPagamento.set(null);
    this.consumo.set('local');
    this.cupom.set(null);
  }
}
