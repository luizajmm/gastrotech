import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CozinhaApi } from '../core/cozinha-api';
import { Pedido } from '../core/modelos';
import { Som } from '../core/som';
import { Telas } from '../shared/telas';

// tela pra deixar numa tv perto do balcão: mostra o que tá sendo feito e o que já pode retirar
@Component({
  selector: 'gt-retirada',
  imports: [DatePipe, Telas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tela">
      <header class="barra">
        <div class="marca">
          <img src="gastrotech-logo.jpg" alt="" width="40" height="40" />
          <h1>Retirada</h1>
        </div>
        <gt-telas [escuro]="true" />
        <div class="lado">
          <button
            class="som"
            type="button"
            data-som
            [class.alerta]="som.ligado() && som.bloqueado()"
            (click)="som.alternar()"
          >
            {{ !som.ligado() ? 'Som desligado' : som.bloqueado() ? 'Toque para ativar o som' : 'Som ligado' }}
          </button>
          <span class="relogio">{{ agora() | date: 'HH:mm' }}</span>
        </div>
      </header>

      @if (chamado(); as pedido) {
        <div class="chamada" role="status">
          <span>Pedido pronto</span>
          <strong>{{ pedido.codigo }}</strong>
          @if (pedido.nome_cliente) {
            <em>{{ pedido.nome_cliente }}</em>
          }
        </div>
      }

      <main class="colunas">
        <section>
          <h2>Preparando</h2>
          <ul class="preparando">
            @for (p of preparando(); track p.id) {
              <li>{{ p.codigo }}</li>
            } @empty {
              <li class="vazio">Nenhum pedido em preparo</li>
            }
          </ul>
        </section>
        <section class="prontos">
          <h2>Pode retirar</h2>
          <ul>
            @for (p of prontos(); track p.id) {
              <li [class.novo]="p.id === chamado()?.id">
                {{ p.codigo }}
                @if (p.nome_cliente) {
                  <small>{{ p.nome_cliente }}</small>
                }
              </li>
            } @empty {
              <li class="vazio">Nada pronto ainda</li>
            }
          </ul>
        </section>
      </main>
    </div>
  `,
  styles: `
    .tela { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100dvh; background: #111; color: var(--papel); }
    .barra { display: flex; align-items: center; gap: var(--espaco-5); padding: var(--espaco-2) var(--espaco-5); background: var(--tinta); }
    .marca { display: flex; align-items: center; gap: var(--espaco-2); }
    .marca img { width: 1.75rem; height: 1.75rem; filter: invert(1); }
    .marca h1 { font-size: 1.1rem; font-weight: 700; }
    .lado { display: flex; align-items: center; gap: var(--espaco-4); margin-left: auto; }
    .relogio { font-size: 1.1rem; font-weight: 700; font-variant-numeric: tabular-nums; }
    .som { min-height: 2rem; padding: 0 var(--espaco-3); border: 1px solid #444; border-radius: 999px; background: none; color: #bdbdbd; font: inherit; font-size: 0.85rem; cursor: pointer; }
    .som:hover { color: var(--papel); border-color: #777; }
    .som.alerta { border-color: var(--brasa); background: var(--brasa); color: var(--tinta); animation: pisca 1.6s ease-in-out infinite; }
    @keyframes pisca { 50% { opacity: 0.6; } }

    .colunas { display: grid; grid-template-columns: 1fr 1.4fr; min-height: 0; }
    section { padding: var(--espaco-6); overflow: auto; }
    section + section { border-left: 1px solid #2a2a2a; }
    h2 { margin-bottom: var(--espaco-5); color: #9a9a9a; font-size: 1.2rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
    .prontos h2 { color: var(--brasa); }
    ul { display: flex; flex-wrap: wrap; gap: var(--espaco-4); margin: 0; padding: 0; list-style: none; }
    li { display: grid; min-width: 7ch; font-size: 2.6rem; font-weight: 800; font-variant-numeric: tabular-nums; }
    .preparando li { color: #8a8a8a; font-size: 2rem; }
    .prontos li { padding: var(--espaco-3) var(--espaco-4); border-radius: var(--raio-medio); background: #1f1f1f; font-size: 3.4rem; }
    .prontos li.novo { background: var(--brasa); color: var(--tinta); }
    li small { font-size: 1rem; font-weight: 500; color: inherit; opacity: 0.8; }
    li.vazio { min-width: 0; padding: 0; background: none; color: #666; font-size: 1.1rem; font-weight: 500; }

    .chamada {
      position: fixed; inset: 0; z-index: 10;
      display: grid; place-content: center; justify-items: center; gap: var(--espaco-3);
      background: var(--brasa); color: var(--tinta);
      animation: aparece 300ms ease-out;
    }
    .chamada span { font-size: 2rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    .chamada strong { font-size: clamp(6rem, 22vmin, 14rem); font-weight: 900; line-height: 1; }
    .chamada em { font-size: 2.2rem; font-style: normal; font-weight: 600; }
    @keyframes aparece { from { opacity: 0; transform: scale(1.05); } }

    @media (max-width: 760px) {
      .barra { flex-wrap: wrap; gap: var(--espaco-3); }
      .colunas { grid-template-columns: 1fr; }
      section + section { border-left: none; border-top: 1px solid #2a2a2a; }
    }
  `,
})
export class Retirada {
  private api = inject(CozinhaApi);
  protected som = inject(Som);

  private readonly fila = toSignal(this.api.fila());
  protected readonly agora = signal(Date.now());
  protected readonly chamado = signal<Pedido | null>(null);

  private readonly pedidos = computed(() => this.fila()?.pedidos ?? []);
  protected readonly preparando = computed(() =>
    this.pedidos().filter((p) => p.status.valor === 'recebido' || p.status.valor === 'em_preparo'),
  );
  // o último que ficou pronto aparece primeiro
  protected readonly prontos = computed(() =>
    this.pedidos()
      .filter((p) => p.status.valor === 'pronto')
      .sort((a, b) => Date.parse(b.pronto_em ?? b.criado_em) - Date.parse(a.pronto_em ?? a.criado_em)),
  );

  private jaProntos?: Set<number>;
  private aChamar: Pedido[] = [];
  private chamando = false;

  constructor() {
    const relogio = setInterval(() => this.agora.set(Date.now()), 15_000);
    inject(DestroyRef).onDestroy(() => clearInterval(relogio));

    effect(() => {
      if (!this.fila()) return;
      const prontos = this.prontos();

      // na primeira carga não chama ninguém, só guarda o que já estava pronto
      if (!this.jaProntos) {
        this.jaProntos = new Set(prontos.map((p) => p.id));
        return;
      }

      const novos = prontos.filter((p) => !this.jaProntos!.has(p.id)).reverse();
      novos.forEach((p) => this.jaProntos!.add(p.id));
      this.aChamar.push(...novos);
      this.chamarProximo();
    });
  }

  // se ficarem prontos vários juntos, chama um de cada vez
  private chamarProximo(): void {
    if (this.chamando) return;
    const pedido = this.aChamar.shift();
    if (!pedido) return;

    this.chamando = true;
    this.chamado.set(pedido);
    this.som.tocar();
    setTimeout(() => {
      this.chamado.set(null);
      this.chamando = false;
      setTimeout(() => this.chamarProximo(), 400);
    }, 5000);
  }
}
