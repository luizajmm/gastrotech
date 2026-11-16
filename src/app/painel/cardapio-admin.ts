import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Avisos } from '../core/avisos';
import { CategoriaPainel, ProdutoPainel } from '../core/modelos';
import { FiltroProdutos, PainelApi } from '../core/painel-api';
import { Sessao } from '../core/sessao';
import { DinheiroPipe } from '../shared/dinheiro.pipe';
import { CategoriaFormJanela } from './categoria-form';
import { ProdutoFormJanela } from './produto-form';

@Component({
  selector: 'gt-cardapio-admin',
  imports: [CategoriaFormJanela, DinheiroPipe, ProdutoFormJanela],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cardapio-admin.html',
  styleUrl: './cardapio-admin.css',
})
export class CardapioAdmin {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);
  protected readonly podeEditar = inject(Sessao).pode('cardapio');

  protected readonly aba = signal<'produtos' | 'categorias'>('produtos');
  protected readonly produtos = signal<ProdutoPainel[] | null>(null);
  protected readonly categorias = signal<CategoriaPainel[]>([]);
  protected readonly filtro = signal<FiltroProdutos>({ busca: '', categoria_id: null, situacao: '' });
  protected readonly limiteEstoque = signal(10);

  /** undefined = fechado, null = novo, objeto = editando */
  protected readonly editandoProduto = signal<ProdutoPainel | null | undefined>(undefined);
  protected readonly editandoCategoria = signal<CategoriaPainel | null | undefined>(undefined);
  protected readonly excluindo = signal<string | null>(null);

  protected readonly filtrosAtivos = computed(() => {
    const f = this.filtro();
    return !!(f.busca || f.categoria_id || f.situacao);
  });

  constructor() {
    this.carregarCategorias();
    this.carregarProdutos();
    firstValueFrom(this.api.configuracoes())
      .then((c) => this.limiteEstoque.set(c.estoque_baixo))
      .catch(() => null);
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected filtrar(parte: Partial<FiltroProdutos>): void {
    this.filtro.update((f) => ({ ...f, ...parte }));
    this.carregarProdutos();
  }

  protected limparFiltros(): void {
    this.filtro.set({ busca: '', categoria_id: null, situacao: '' });
    this.carregarProdutos();
  }

  protected produtoSalvo(): void {
    this.editandoProduto.set(undefined);
    this.carregarProdutos();
    this.carregarCategorias();
  }

  protected categoriaSalva(): void {
    this.editandoCategoria.set(undefined);
    this.carregarCategorias();
    this.carregarProdutos();
  }

  protected async alternarAtivo(produto: ProdutoPainel): Promise<void> {
    try {
      const { id, imagem_url: _i, categoria: _c, ...dados } = produto;
      await firstValueFrom(this.api.salvarProduto({ ...dados, ativo: !produto.ativo }, id));
      this.avisos.sucesso(produto.ativo ? `${produto.nome} saiu do totem.` : `${produto.nome} voltou para o totem.`);
      this.carregarProdutos();
    } catch (e) {
      this.avisos.erro(e);
    }
  }

  protected async excluirProduto(produto: ProdutoPainel): Promise<void> {
    try {
      await firstValueFrom(this.api.excluirProduto(produto.id));
      this.excluindo.set(null);
      this.avisos.sucesso(`${produto.nome} excluído.`);
      this.carregarProdutos();
      this.carregarCategorias();
    } catch (e) {
      this.avisos.erro(e);
    }
  }

  protected async excluirCategoria(categoria: CategoriaPainel): Promise<void> {
    try {
      await firstValueFrom(this.api.excluirCategoria(categoria.id));
      this.excluindo.set(null);
      this.avisos.sucesso(`Categoria ${categoria.nome} excluída.`);
      this.carregarCategorias();
      this.carregarProdutos();
    } catch (e) {
      this.avisos.erro(e);
    }
  }

  private async carregarProdutos(): Promise<void> {
    try {
      this.produtos.set(await firstValueFrom(this.api.produtos(this.filtro())));
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível carregar os produtos.');
    }
  }

  private async carregarCategorias(): Promise<void> {
    try {
      this.categorias.set(await firstValueFrom(this.api.categorias()));
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível carregar as categorias.');
    }
  }
}
