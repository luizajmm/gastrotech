import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CONFIG } from '../config';
import { Sessao } from '../core/sessao';

/**
 * Tela de entrada do sistema (http://localhost:4200):
 * escolhe entre o totem do cliente e as telas da equipe.
 * O aparelho do totem deve abrir direto em /#/totem.
 */
@Component({
  selector: 'gt-inicio',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="tela">
      <header class="marca">
        <img src="demo/gastrotech-logo.jpg" alt="" width="72" height="72" />
        <h1>GastroTech</h1>
        <p>Escolha a tela que este aparelho vai usar.</p>
      </header>

      <nav class="opcoes" aria-label="Telas do sistema">
        <a class="opcao" routerLink="/totem">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2.5h10a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1zM10 18.5h4" /></svg>
          <strong>Totem</strong>
          <span>O cliente monta e paga o pedido.</span>
        </a>
        <a class="opcao" routerLink="/cozinha">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM2.5 10.5h19M9 6.5c0-1.5 1-1.5 1-3M14 6.5c0-1.5 1-1.5 1-3" /></svg>
          <strong>Cozinha</strong>
          <span>Fila de pedidos que atualiza sozinha.</span>
        </a>
        <a class="opcao" routerLink="/painel">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-4H4z" /></svg>
          <strong>Painel</strong>
          <span>Cardápio, vendas, caixa e equipe.</span>
        </a>
      </nav>

      <footer class="rodape">
        @if (sessao.logado()) {
          <span>Conectado como <strong>{{ sessao.usuario()?.nome }}</strong></span>
          <button class="btn btn-discreto" type="button" (click)="sair()">Sair</button>
        } @else {
          <a class="btn btn-discreto" routerLink="/entrar" [queryParams]="{ volta: '/painel' }">Entrar na equipe</a>
        }
      </footer>
    </main>
  `,
  styles: `
    .tela {
      display: grid;
      align-content: center;
      justify-items: center;
      gap: var(--espaco-6);
      min-height: 100dvh;
      padding: var(--espaco-6) var(--espaco-4);
      background: var(--fumaca);
    }
    .marca { display: grid; justify-items: center; gap: var(--espaco-2); text-align: center; }
    .marca img { width: 4.5rem; height: 4.5rem; mix-blend-mode: multiply; }
    .marca h1 { font-size: 2.2rem; font-weight: 900; }
    .marca p { color: var(--grafite); }
    .opcoes {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--espaco-4);
      width: min(100%, 52rem);
    }
    .opcao {
      display: grid;
      align-content: start;
      gap: var(--espaco-2);
      padding: var(--espaco-5);
      border-radius: var(--raio-grande);
      background: var(--papel);
      color: var(--tinta);
      text-decoration: none;
      transition: box-shadow 150ms ease;
    }
    .opcao:hover,
    .opcao:focus-visible { box-shadow: var(--traco-triplo); outline: none; }
    .opcao svg {
      width: 2.25rem; height: 2.25rem; margin-bottom: var(--espaco-3);
      fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round;
    }
    .opcao strong { font-size: 1.4rem; font-weight: 800; }
    .opcao span { color: var(--grafite); }
    .rodape { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--espaco-3); color: var(--grafite); }
    .rodape .btn { min-height: 2.75rem; font-size: 1rem; }
    @media (max-width: 640px) {
      .opcoes { grid-template-columns: minmax(0, 1fr); }
      .opcao { grid-template-columns: auto 1fr; column-gap: var(--espaco-4); align-items: center; }
      .opcao svg { grid-row: span 2; margin: 0; }
    }
  `,
})
export class Inicio {
  protected readonly sessao = inject(Sessao);
  private router = inject(Router);
  protected readonly demonstracao = CONFIG.modoDemonstracao;

  protected async sair(): Promise<void> {
    await this.sessao.sair();
    await this.router.navigateByUrl('/');
  }
}
