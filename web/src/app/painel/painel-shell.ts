import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Avisos } from '../core/avisos';
import { Sessao } from '../core/sessao';
import { Telas } from '../shared/telas';

interface ItemMenu {
  rota: string;
  nome: string;
  icone: string;
  exato?: boolean;
  area?: string;
}

const MENU: ItemMenu[] = [
  { rota: '/painel', nome: 'Visão geral', exato: true, icone: 'M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-4H4z' },
  { rota: '/painel/pedidos', nome: 'Pedidos', area: 'pedidos', icone: 'M7 4h10v16l-2.5-1.5L12 20l-2.5-1.5L7 20zM10 9h4M10 13h4' },
  { rota: '/painel/cardapio', nome: 'Cardápio', area: 'cardapio', icone: 'M4 10.5a8 6 0 0 1 16 0zM3 14h18M5 17v.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V17' },
  { rota: '/painel/cupons', nome: 'Promoções', area: 'cardapio', icone: 'M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2zM9 9.5h.01M15 14.5h.01M15 9l-6 6' },
  { rota: '/painel/financeiro', nome: 'Financeiro', area: 'caixa', icone: 'M4 19V9M10 19V5M16 19v-7M3 19h18' },
  { rota: '/painel/equipe', nome: 'Equipe', area: 'usuarios', icone: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6 6 0 0 1 3 5.5' },
  { rota: '/painel/configuracoes', nome: 'Configurações', area: 'configuracoes', icone: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.5-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.4-2.6a7 7 0 0 0 2-1.2l2.5 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z' },
];

@Component({
  selector: 'gt-painel-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Telas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './painel-shell.html',
  styleUrl: './painel-shell.css',
  host: { class: 'painel-app' },
})
export class PainelShell {
  protected readonly sessao = inject(Sessao);
  protected readonly avisos = inject(Avisos);
  private router = inject(Router);

  protected readonly menuAberto = signal(false);
  protected readonly menu = MENU.filter((item) => !item.area || this.sessao.ve(item.area));

  protected readonly nomeUsuario = computed(() =>
    this.sessao.usuario()?.nome ?? 'Equipe',
  );
  protected readonly papelUsuario = computed(() =>
    this.sessao.usuario()?.papel.rotulo ?? '',
  );

  protected readonly rotaAtual = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => {
        this.menuAberto.set(false);
        return (e as NavigationEnd).urlAfterRedirects;
      }),
    ),
  );

  protected async sair(): Promise<void> {
    await this.sessao.sair();
    await this.router.navigateByUrl('/entrar?volta=/painel');
  }
}
