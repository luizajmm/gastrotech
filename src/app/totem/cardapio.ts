import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Carrinho } from '../core/carrinho';
import { Loja } from '../core/loja';
import { Categoria, Produto } from '../core/modelos';
import { DinheiroPipe } from '../shared/dinheiro.pipe';
import { IconeCategoria } from '../shared/icone-categoria';
import { ProdutoDetalhe } from './produto-detalhe';

/** Categoria especial com os destaques de todas as categorias. */
const MAIS_PEDIDOS = -1;

@Component({
  selector: 'gt-cardapio',
  imports: [DinheiroPipe, IconeCategoria, ProdutoDetalhe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cardapio.html',
  styleUrl: './cardapio.css',
})
export class CardapioPagina {
  protected readonly loja = inject(Loja);
  protected readonly carrinho = inject(Carrinho);
  private router = inject(Router);

  protected readonly selecionada = signal<number>(MAIS_PEDIDOS);
  protected readonly aberto = signal<Produto | null>(null);
  protected readonly confirmacao = signal<string | null>(null);

  protected readonly categorias = computed<Categoria[]>(() => {
    const cardapio = this.loja.cardapio();
    if (!cardapio) return [];

    const destaques = cardapio.categorias.flatMap((c) => c.produtos).filter((p) => p.destaque);
    const maisPedidos: Categoria = {
      id: MAIS_PEDIDOS,
      nome: 'Mais pedidos',
      descricao: 'Os favoritos da casa',
      icone: 'destaques',
      ordem: 0,
      ativo: true,
      produtos: destaques,
    };

    return destaques.length ? [maisPedidos, ...cardapio.categorias] : cardapio.categorias;
  });

  protected readonly atual = computed(
    () => this.categorias().find((c) => c.id === this.selecionada()) ?? this.categorias()[0],
  );

  protected escolherCategoria(id: number): void {
    this.selecionada.set(id);
    document.querySelector('.produtos')?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected adicionado(nome: string): void {
    this.aberto.set(null);
    this.confirmacao.set(nome);
    setTimeout(() => this.confirmacao.set(null), 2200);
  }

  protected recomecar(): void {
    this.carrinho.limpar();
    this.router.navigateByUrl('/totem');
  }
}
