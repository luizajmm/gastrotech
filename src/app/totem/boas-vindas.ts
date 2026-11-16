import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Carrinho } from '../core/carrinho';
import { Loja } from '../core/loja';

@Component({
  selector: 'gt-boas-vindas',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="tela" (click)="comecar()">
      <div class="marca">
        <div class="ondas" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
        @if (logo(); as url) {
          <img class="logo" [src]="url" alt="" width="320" height="320" />
        }
      </div>

      <h1>{{ nome() }}</h1>
      @if (frase()) {
        <p class="frase">{{ frase() }}</p>
      }

      <button class="btn btn-brasa comecar" type="button" (click)="comecar(); $event.stopPropagation()">
        Toque para pedir
      </button>

      <a class="acompanhar" routerLink="/totem/acompanhar" (click)="$event.stopPropagation()">
        Já pediu? Acompanhe seu pedido
      </a>
    </main>
  `,
  styles: `
    .tela {
      display: grid;
      grid-template-rows: 1fr auto auto auto auto 1fr auto;
      justify-items: center;
      min-height: 100dvh;
      padding: var(--espaco-7) var(--espaco-5) var(--espaco-6);
      text-align: center;
      cursor: pointer;
      overflow: clip;
    }

    .marca {
      position: relative;
      grid-row: 2;
      display: grid;
      place-items: center;
      width: min(56vw, 16rem, 30dvh);
      aspect-ratio: 1;
      margin-bottom: clamp(var(--espaco-5), 5dvh, var(--espaco-7));
    }

    .logo {
      position: relative;
      width: 100%;
      height: 100%;
      object-fit: contain;
      mix-blend-mode: multiply; /* a logo vem em JPG com fundo branco */
    }

    /* Três anéis saindo da logo: o traço triplo em movimento, convidando ao toque */
    .ondas span {
      position: absolute;
      inset: -8%;
      border: 2px solid var(--tinta);
      border-radius: 50%;
      opacity: 0;
      animation: onda 4.2s cubic-bezier(0.2, 0.6, 0.3, 1) infinite;
    }
    .ondas span:nth-child(2) { animation-delay: 0.35s; }
    .ondas span:nth-child(3) { animation-delay: 0.7s; }

    @keyframes onda {
      0% { transform: scale(0.95); opacity: 0; }
      12% { opacity: 0.9; }
      70%, 100% { transform: scale(2.1); opacity: 0; }
    }

    h1 {
      grid-row: 3;
      font-size: clamp(2.6rem, min(9vw, 9dvh), 5.5rem);
      font-weight: 900;
      font-variation-settings: 'wdth' 100;
      letter-spacing: -0.02em;
    }

    .frase {
      grid-row: 4;
      margin-top: var(--espaco-3);
      font-size: 1.35rem;
      color: var(--grafite);
      max-width: 24ch;
    }

    .comecar {
      grid-row: 5;
      margin-top: clamp(var(--espaco-5), 5dvh, var(--espaco-7));
      min-height: 5.5rem;
      padding: 0 var(--espaco-7);
      font-size: 1.6rem;
      white-space: nowrap;
    }

    .acompanhar {
      grid-row: 7;
      padding: var(--espaco-4);
      color: var(--tinta);
      font-weight: 600;
      text-underline-offset: 0.25em;
    }

    @media (max-width: 700px) {
      .comecar { padding: 0 var(--espaco-6); font-size: 1.35rem; min-height: 4.5rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .ondas span { animation: none; opacity: 0.25; }
      .ondas span:nth-child(2) { transform: scale(1.14); }
      .ondas span:nth-child(3) { transform: scale(1.28); }
    }
  `,
})
export class BoasVindas {
  private loja = inject(Loja);
  private router = inject(Router);
  private carrinho = inject(Carrinho);

  protected readonly nome = computed(() => this.loja.cardapio()?.loja.nome_loja ?? 'GastroTech');
  protected readonly frase = computed(() => this.loja.cardapio()?.loja.frase_totem);
  protected readonly logo = computed(() => this.loja.cardapio()?.loja.logo_url ?? 'gastrotech-logo.jpg');

  protected comecar(): void {
    this.carrinho.limpar();
    this.loja.carregar(true);
    this.router.navigateByUrl('/totem/cardapio');
  }
}
