import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CONFIG } from '../config';
import { ErroApi } from '../core/modelos';
import { Sessao } from '../core/sessao';

@Component({
  selector: 'gt-entrar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="tela">
      <div class="conjunto">
      <form class="caixa" (submit)="$event.preventDefault(); entrar()">
        <img src="demo/gastrotech-logo.jpg" alt="" width="88" height="88" />
        <h1>Entrar na equipe</h1>
        <p class="texto-suave">Acesso da cozinha e do painel.</p>

        <label for="email">E-mail</label>
        <input
          id="email"
          type="email"
          autocomplete="username"
          required
          [value]="email()"
          (input)="email.set($any($event.target).value)"
        />

        <label for="senha">Senha</label>
        <input
          id="senha"
          type="password"
          autocomplete="current-password"
          required
          [value]="senha()"
          (input)="senha.set($any($event.target).value)"
        />

        @if (erro(); as mensagem) {
          <p class="erro" role="alert">{{ mensagem }}</p>
        }

        <button class="btn btn-brasa btn-largo" type="submit" [disabled]="enviando()">
          {{ enviando() ? 'Entrando' : 'Entrar' }}
        </button>

      </form>
        @if (demonstracao) {
          <aside class="acessos" aria-labelledby="acessos-titulo">
            <h2 id="acessos-titulo">Acessos de teste</h2>
            <p class="texto-suave">Senha de todos: <strong>gastrotech</strong>. Toque em um para preencher.</p>
            <ul>
              @for (acesso of acessosDemo; track acesso.email) {
                <li>
                  <button type="button" (click)="preencher(acesso.email)">
                    <strong>{{ acesso.papel }}</strong>
                    <span>{{ acesso.ve }}</span>
                  </button>
                </li>
              }
            </ul>
          </aside>
        }
      </div>
    </main>
  `,
  styles: `
    .tela {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: 4.5rem var(--espaco-4) var(--espaco-5);
      background: var(--fumaca);
    }
    .conjunto { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--espaco-5); width: 100%; }
    .caixa {
      display: grid;
      gap: var(--espaco-2);
      width: min(100%, 26rem);
      padding: var(--espaco-6) var(--espaco-5);
      border-radius: var(--raio-grande);
      background: var(--papel);
      box-shadow: var(--traco-triplo);
    }
    img { justify-self: center; width: 3.75rem; height: 3.75rem; margin-bottom: var(--espaco-1); }
    h1 { font-size: 1.9rem; text-align: center; text-wrap: balance; }
    .caixa > .texto-suave { text-align: center; margin-bottom: var(--espaco-4); }
    label { margin-top: var(--espaco-2); font-weight: 700; }
    input {
      min-height: 3.25rem;
      padding: 0 var(--espaco-4);
      border: 2px solid var(--tinta);
      border-radius: var(--raio-medio);
      font-size: 1.1rem;
    }
    .erro { margin-top: var(--espaco-2); color: var(--alerta); font-weight: 650; }
    .btn { margin-top: var(--espaco-4); }
    .acessos { display: grid; gap: var(--espaco-2); width: min(100%, 19rem); }
    .acessos h2 { font-size: 1rem; }
    .acessos p { font-size: 0.9rem; }
    .acessos ul { display: grid; gap: var(--espaco-2); margin: var(--espaco-2) 0 0; padding: 0; list-style: none; }
    .acessos button {
      display: grid; gap: 0.1rem; width: 100%; padding: var(--espaco-2) var(--espaco-3);
      border: 0; border-radius: var(--raio-medio); background: var(--papel); text-align: left; color: var(--tinta);
    }
    .acessos button:hover, .acessos button:focus-visible { box-shadow: inset 0 0 0 2px var(--tinta); outline: none; }
    .acessos button span { font-size: 0.82rem; color: var(--grafite); }
  `,
})
export class Entrar implements OnInit {
  private sessao = inject(Sessao);
  private router = inject(Router);

  readonly volta = input<string>('/cozinha');

  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly erro = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected readonly demonstracao = CONFIG.modoDemonstracao;
  protected readonly acessosDemo = [
    { papel: 'Administrador', email: 'admin@gastrotech.com', ve: 'tudo' },
    { papel: 'Atendimento', email: 'atendimento@gastrotech.com', ve: 'cozinha, pedidos e caixa' },
    { papel: 'Cardápio', email: 'cardapio@gastrotech.com', ve: 'só o cardápio' },
    { papel: 'Consulta', email: 'leitura@gastrotech.com', ve: 'só olha, não altera' },
  ];

  ngOnInit(): void {
    // quem já entrou não precisa ver o login de novo
    if (this.sessao.logado()) this.router.navigateByUrl(this.volta() || '/cozinha');
  }

  protected preencher(email: string): void {
    this.email.set(email);
    this.senha.set('gastrotech');
    this.erro.set(null);
  }

  protected async entrar(): Promise<void> {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.erro.set(null);

    try {
      await this.sessao.entrar(this.email().trim(), this.senha());
      await this.router.navigateByUrl(this.volta() || '/cozinha');
    } catch (e) {
      if (!(e instanceof HttpErrorResponse)) {
        this.erro.set(e instanceof Error ? e.message : 'Não foi possível entrar.');
        return;
      }
      const http = e;
      const corpo = http.error as ErroApi | null;
      this.erro.set(
        http.status === 0
          ? 'Sem conexão com o sistema. Confira se a API está ligada.'
          : (Object.values(corpo?.errors ?? {}).flat()[0] ?? corpo?.message ?? 'Não foi possível entrar.'),
      );
    } finally {
      this.enviando.set(false);
    }
  }
}
