import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'gt-cabecalho-etapa',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <a class="voltar" [routerLink]="voltarPara()" [attr.aria-label]="'Voltar para ' + voltarTexto()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        <span>{{ voltarTexto() }}</span>
      </a>
      <h1>{{ titulo() }}</h1>
    </header>
    <div class="traco-triplo"></div>
  `,
  styles: `
    :host { display: block; width: min(100%, 60rem); margin-inline: auto; padding: var(--espaco-4) var(--espaco-5) 0; }
    header { display: grid; gap: var(--espaco-4); padding-bottom: var(--espaco-4); }
    .voltar {
      display: inline-flex; align-items: center; gap: var(--espaco-2);
      justify-self: start; min-height: 3.25rem; padding-right: var(--espaco-4);
      color: var(--tinta); font-weight: 650; text-decoration: none;
    }
    .voltar svg { width: 1.6rem; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
    h1 { font-size: clamp(2.2rem, 6vw, 3.5rem); font-weight: 900; font-variation-settings: 'wdth' 100; }
    @media (orientation: landscape) and (min-width: 701px) and (max-height: 900px) {
      :host { padding-top: var(--espaco-2); }
      header { gap: var(--espaco-1); padding-bottom: var(--espaco-2); }
      .voltar { min-height: 2.5rem; }
      h1 { font-size: 2.2rem; }
    }
  `,
})
export class CabecalhoEtapa {
  readonly titulo = input.required<string>();
  readonly voltarPara = input('/totem/cardapio');
  readonly voltarTexto = input('Cardápio');
}
