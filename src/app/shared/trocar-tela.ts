import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

const TELAS = [
  { rota: '/', nome: 'Início', prefixo: null },
  { rota: '/totem', nome: 'Totem', prefixo: '/totem' },
  { rota: '/cozinha', nome: 'Cozinha', prefixo: '/cozinha' },
  { rota: '/painel', nome: 'Painel', prefixo: '/painel' },
];

// botão "telas" pra trocar entre totem, cozinha e painel na apresentação (só na demonstração)
@Component({
  selector: 'gt-trocar-tela',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'aberto.set(false)' },
  template: `
    @if (rotaAtual() !== '/') {
      <div class="trocar" [class.aberto]="aberto()">
        @if (aberto()) {
          <nav aria-label="Trocar de tela">
            @for (t of telas; track t.rota) {
              <a [href]="'#' + destino(t.rota, t.prefixo)" [class.atual]="atual(t.prefixo)" (click)="$event.preventDefault(); ir(t.rota, t.prefixo)">{{ t.nome }}</a>
            }
          </nav>
        }
        <button type="button" [attr.aria-expanded]="aberto()" (click)="aberto.set(!aberto())">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          {{ aberto() ? 'Fechar' : 'Telas' }}
        </button>
      </div>
    }
  `,
  styles: `
    /* Aba pequena presa no topo, para não tampar títulos */
    .trocar {
      position: fixed;
      top: 0;
      left: 50%;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 3px;
      padding: env(safe-area-inset-top, 0px) 3px 3px;
      border-radius: 0 0 12px 12px;
      background: var(--tinta);
      box-shadow: 0 4px 14px rgb(0 0 0 / 0.18);
      transform: translateX(-50%);
      font-family: var(--fonte);
      font-size: 12px;
      opacity: 0.85;
      transition: opacity 150ms ease;
    }
    .trocar:hover, .trocar:focus-within, .trocar.aberto { opacity: 1; }
    .trocar.aberto { padding-top: calc(3px + env(safe-area-inset-top, 0px)); }
    nav { display: flex; gap: 2px; }
    a, button {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 24px;
      padding: 0 10px;
      border: 0;
      border-radius: 0 0 9px 9px;
      background: transparent;
      color: var(--papel);
      font: inherit;
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
    }
    .aberto a, .aberto button { min-height: 30px; border-radius: 9px; font-size: 13px; }
    a:hover { background: rgb(255 255 255 / 0.14); }
    a.atual { background: var(--papel); color: var(--tinta); }
    button { background: var(--brasa); color: var(--tinta); }
    svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2.6; stroke-linecap: round; }
    @media (max-width: 480px) {
      a, button { padding: 0 8px; }
    }
  `,
})
export class TrocarTela {
  private router = inject(Router);

  protected readonly telas = TELAS;
  protected readonly aberto = signal(false);
  protected readonly rotaAtual = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => {
        const url = (e as NavigationEnd).urlAfterRedirects;
        // guarda onde a pessoa estava em cada tela, para voltar no mesmo ponto
        const tela = TELAS.find((t) => t.prefixo && url.startsWith(t.prefixo));
        if (tela?.prefixo) this.ultimas.set(tela.prefixo, url);
        return url;
      }),
    ),
    { initialValue: '/' },
  );

  private ultimas = new Map<string, string>();

  protected destino(rota: string, prefixo: string | null): string {
    if (!prefixo || this.atual(prefixo)) return rota;
    return this.ultimas.get(prefixo) ?? rota;
  }

  protected ir(rota: string, prefixo: string | null): void {
    this.aberto.set(false);
    this.router.navigateByUrl(this.destino(rota, prefixo));
  }

  protected atual(prefixo: string | null): boolean {
    const url = this.rotaAtual() ?? '/';
    return prefixo ? url.startsWith(prefixo) : url === '/';
  }
}
