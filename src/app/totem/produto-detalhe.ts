import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Carrinho } from '../core/carrinho';
import { GrupoPersonalizacao, Produto } from '../core/modelos';
import { DinheiroPipe } from '../shared/dinheiro.pipe';

@Component({
  selector: 'gt-produto-detalhe',
  imports: [DinheiroPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './produto-detalhe.html',
  styleUrl: './produto-detalhe.css',
})
export class ProdutoDetalhe {
  private carrinho = inject(Carrinho);

  readonly produto = input.required<Produto>();
  readonly fechar = output<void>();
  readonly adicionado = output<string>();

  private dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly escolhas = signal<Record<string, string>>({});
  protected readonly quantidade = signal(1);
  protected readonly observacao = signal('');

  /** Quanto ainda dá para adicionar, descontando o que já está no carrinho. */
  protected readonly maximo = computed(() =>
    Math.max(0, Math.min(20, this.produto().estoque - this.carrinho.quantidadeDo(this.produto().id))),
  );

  protected readonly pendentes = computed(() =>
    this.produto()
      .personalizacoes.filter((g) => g.obrigatorio && !this.escolhas()[g.nome])
      .map((g) => g.nome),
  );

  protected readonly total = computed(() => this.produto().preco * this.quantidade());

  constructor() {
    afterNextRender(() => this.dialogo().nativeElement.showModal());
  }

  protected escolher(grupo: GrupoPersonalizacao, opcao: string): void {
    this.escolhas.update((atual) => {
      const novo = { ...atual };
      // Opcional: tocar de novo na mesma opção desmarca
      if (!grupo.obrigatorio && novo[grupo.nome] === opcao) {
        delete novo[grupo.nome];
      } else {
        novo[grupo.nome] = opcao;
      }
      return novo;
    });
  }

  protected mudarQuantidade(delta: number): void {
    this.quantidade.update((q) => Math.min(this.maximo(), Math.max(1, q + delta)));
  }

  protected adicionar(): void {
    if (this.pendentes().length || this.maximo() < 1) return;

    this.carrinho.adicionar(this.produto(), this.quantidade(), this.escolhas(), this.observacao());
    this.adicionado.emit(this.produto().nome);
  }

  /** Toque fora do painel fecha. */
  protected cliqueNoFundo(evento: MouseEvent): void {
    if (evento.target === this.dialogo().nativeElement) this.fechar.emit();
  }

  protected listaAlergenos(): string {
    const lista = this.produto().alergenos.map((a) => a.toLowerCase());
    if (lista.length <= 1) return lista.join('');
    return `${lista.slice(0, -1).join(', ')} e ${lista.at(-1)}`;
  }
}
