import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Sessao } from '../core/sessao';

@Component({
  selector: 'gt-telas',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="telas" [class.escuro]="escuro()" [class.largo]="largo()" aria-label="Trocar de tela">
      <a routerLink="/" class="inicio" aria-label="Início" title="Início">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" /></svg>
      </a>
      @for (tela of telas; track tela.rota) {
        @if (!tela.area || sessao.ve(tela.area)) {
          <a [routerLink]="tela.rota" routerLinkActive="atual" ariaCurrentWhenActive="page">{{ tela.nome }}</a>
        }
      }
    </nav>
  `,
  styles: `
    .telas {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 3px;
      border-radius: 999px;
      background: var(--fumaca);
    }
    a {
      display: inline-flex;
      align-items: center;
      min-height: 2rem;
      padding: 0 var(--espaco-3);
      border-radius: 999px;
      color: var(--grafite);
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
    }
    a:hover { color: var(--tinta); }
    a.atual { background: var(--tinta); color: var(--papel); }
    .inicio { padding: 0 var(--espaco-2); }
    svg { width: 1.1rem; height: 1.1rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

    .largo { display: flex; width: 100%; }
    .largo a { flex: 1; min-width: 0; justify-content: center; padding: 0 0.4rem; font-size: 0.82rem; }
    .largo .inicio { flex: none; padding: 0 0.45rem; }

    .escuro { background: #262626; }
    .escuro a { color: #bdbdbd; }
    .escuro a:hover { color: var(--papel); }
    .escuro a.atual { background: var(--papel); color: var(--tinta); }
  `,
})
export class Telas {
  readonly escuro = input(false);
  readonly largo = input(false);

  protected readonly sessao = inject(Sessao);

  protected readonly telas: { rota: string; nome: string; area?: string }[] = [
    { rota: '/totem', nome: 'Totem' },
    { rota: '/cozinha', nome: 'Cozinha', area: 'pedidos' },
    { rota: '/painel', nome: 'Painel' },
  ];
}
