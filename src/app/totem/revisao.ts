import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Carrinho } from '../core/carrinho';
import { CabecalhoEtapa } from '../shared/cabecalho-etapa';
import { DinheiroPipe } from '../shared/dinheiro.pipe';

@Component({
  selector: 'gt-revisao',
  imports: [CabecalhoEtapa, DinheiroPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tela">
      <gt-cabecalho-etapa titulo="Seu pedido" />

      @if (carrinho.vazio()) {
        <section class="vazio">
          <p>Seu pedido ainda não tem itens.</p>
          <a class="btn btn-tinta" routerLink="/totem/cardapio">Ver o cardápio</a>
        </section>
      } @else {
        <ul class="linhas">
          @for (linha of carrinho.linhas(); track linha.chave) {
            <li class="linha">
              @if (linha.produto.imagem_url) {
                <img [src]="linha.produto.imagem_url" alt="" width="112" height="112" />
              }
              <div class="detalhes">
                <h2>{{ linha.produto.nome }}</h2>
                @for (escolha of escolhasDe(linha.personalizacoes); track escolha) {
                  <p class="texto-suave">{{ escolha }}</p>
                }
                @if (linha.observacao) {
                  <p class="observacao">“{{ linha.observacao }}”</p>
                }
                <button class="remover" type="button" (click)="carrinho.remover(linha.chave)">Remover</button>
              </div>
              <div class="lado">
                <span class="preco">{{ linha.produto.preco * linha.quantidade | dinheiro }}</span>
                <div class="quantidade" role="group" [attr.aria-label]="'Quantidade de ' + linha.produto.nome">
                  <button type="button" [attr.aria-label]="linha.quantidade === 1 ? 'Remover' : 'Diminuir'" (click)="carrinho.alterarQuantidade(linha.chave, -1)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
                  </button>
                  <output>{{ linha.quantidade }}</output>
                  <button
                    type="button"
                    aria-label="Aumentar"
                    [disabled]="carrinho.quantidadeDo(linha.produto.id) >= linha.produto.estoque"
                    (click)="carrinho.alterarQuantidade(linha.chave, 1)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                </div>
              </div>
            </li>
          }
        </ul>

        <footer class="fechamento">
          <div class="total">
            <span>Total</span>
            <strong class="preco">{{ carrinho.total() | dinheiro }}</strong>
          </div>
          <a class="btn btn-brasa btn-largo" routerLink="/totem/pagamento">Ir para o pagamento</a>
          <a class="btn btn-contorno btn-largo" routerLink="/totem/cardapio">Adicionar mais itens</a>
        </footer>
      }
    </div>
  `,
  styles: `
    .tela { display: flex; flex-direction: column; min-height: 100dvh; }
    .linhas, .fechamento, .vazio { width: min(100%, 60rem); margin-inline: auto; }

    .linhas { flex: 1; margin-block: 0; padding: var(--espaco-3) var(--espaco-5); list-style: none; }

    .linha {
      display: grid;
      grid-template-columns: 7rem minmax(0, 1fr) auto;
      gap: var(--espaco-4);
      align-items: start;
      padding: var(--espaco-5) 0;
      border-bottom: 2px solid var(--fumaca);
    }
    .linha img { width: 7rem; height: 7rem; object-fit: cover; border-radius: var(--raio-medio); }

    .detalhes { display: grid; gap: var(--espaco-1); }
    .detalhes h2 { font-size: 1.35rem; font-variation-settings: 'wdth' 100; margin-bottom: var(--espaco-1); }
    .observacao { font-style: italic; }
    .remover {
      justify-self: start; margin-top: var(--espaco-2); padding: var(--espaco-2) 0;
      border: 0; background: none; color: var(--grafite);
      text-decoration: underline; text-underline-offset: 0.2em; font-weight: 600;
    }

    .lado { display: grid; justify-items: end; gap: var(--espaco-3); }
    .lado .preco { font-size: 1.3rem; }

    .quantidade { display: flex; align-items: center; gap: var(--espaco-1); }
    .quantidade button {
      display: grid; place-items: center; width: 3.25rem; height: 3.25rem;
      border: 0; border-radius: 50%; background: var(--fumaca);
    }
    .quantidade button:disabled { opacity: 0.35; cursor: not-allowed; }
    .quantidade svg { width: 40%; fill: none; stroke: var(--tinta); stroke-width: 2.6; stroke-linecap: round; }
    output { min-width: 2ch; font-size: 1.3rem; font-weight: 800; text-align: center; }

    .fechamento {
      position: sticky; bottom: 0;
      display: grid; gap: var(--espaco-3);
      padding: var(--espaco-5) var(--espaco-5) calc(var(--espaco-5) + env(safe-area-inset-bottom));
      background: var(--papel); border-top: 2px solid var(--tinta);
    }
    .total { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: var(--espaco-2); }
    .total span { font-size: 1.3rem; font-weight: 650; }
    .total .preco { font-size: 2.25rem; }
    .fechamento .btn-brasa { min-height: 5rem; font-size: 1.35rem; }

    .vazio { flex: 1; display: grid; place-content: center; justify-items: center; gap: var(--espaco-5); padding: var(--espaco-6); font-size: 1.2rem; }

    @media (max-width: 700px) {
      .linhas { padding-inline: var(--espaco-4); }
      .linha { grid-template-columns: 4rem minmax(0, 1fr); }
      .linha img { width: 4rem; height: 4rem; }
      .lado { grid-column: 2; grid-auto-flow: column; justify-content: space-between; align-items: center; justify-items: start; }
      .fechamento { padding-inline: var(--espaco-4); }
    }
  `,
})
export class Revisao {
  protected readonly carrinho = inject(Carrinho);

  protected escolhasDe(personalizacoes: Record<string, string>): string[] {
    return Object.entries(personalizacoes).map(([grupo, opcao]) => `${grupo}: ${opcao}`);
  }
}
