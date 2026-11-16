import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TotemApi } from '../core/totem-api';
import { CabecalhoEtapa } from '../shared/cabecalho-etapa';

/**
 * Cliente digita o código (A + números) num teclado na tela,
 * já que o totem não tem teclado físico.
 */
@Component({
  selector: 'gt-acompanhar',
  imports: [CabecalhoEtapa],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'teclaFisica($event)' },
  template: `
    <div class="tela">
      <gt-cabecalho-etapa titulo="Acompanhar pedido" voltarPara="/totem" voltarTexto="Início" />

      <form class="corpo" (submit)="$event.preventDefault(); buscar()">
        <p class="pergunta">Digite o código que apareceu no fim do seu pedido.</p>

        <output class="visor" [class.vazio]="!numeros()" aria-live="polite" aria-label="Código digitado">
          <span>A</span>{{ numeros() || '000' }}
        </output>

        @if (erro(); as mensagem) {
          <p class="erro" role="alert">{{ mensagem }}</p>
        }

        <div class="teclado">
          @for (tecla of teclas; track tecla) {
            <button type="button" class="tecla" (click)="digitar(tecla)">{{ tecla }}</button>
          }
          <button type="button" class="tecla apagar" aria-label="Apagar" (click)="apagar()" [disabled]="!numeros()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11v12H9l-6-6zM12.5 9.5l5 5M17.5 9.5l-5 5" /></svg>
          </button>
          <button type="button" class="tecla" (click)="digitar('0')">0</button>
          <button type="submit" class="tecla ok" [disabled]="!pronto() || buscando()">Ver</button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .tela { display: flex; flex-direction: column; min-height: 100dvh; }
    .corpo { flex: 1; display: grid; align-content: start; justify-items: center; gap: clamp(var(--espaco-3), 3dvh, var(--espaco-5)); padding: clamp(var(--espaco-4), 4dvh, var(--espaco-6)) var(--espaco-5); }
    .pergunta { font-size: 1.25rem; text-align: center; max-width: 28ch; }

    .visor {
      font-family: var(--fonte-codigo);
      font-size: clamp(3.5rem, min(18vw, 14dvh), 8rem);
      line-height: 1.1;
    }
    .visor.vazio { color: var(--fumaca-forte); }
    .visor.vazio span { color: var(--tinta); }

    .erro { color: var(--alerta); font-weight: 650; text-align: center; }

    .teclado {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--espaco-3);
      width: min(100%, 26rem);
    }
    .tecla {
      min-height: clamp(3.75rem, 9dvh, 5rem);
      border: 0;
      border-radius: var(--raio-medio);
      background: var(--fumaca);
      font-size: 1.9rem;
      font-weight: 750;
      font-variation-settings: 'wdth' 100;
    }
    .tecla:active:not(:disabled) { background: var(--fumaca-forte); }
    .tecla:disabled { opacity: 0.4; cursor: not-allowed; }
    .apagar svg { width: 2rem; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round; }
    .ok { background: var(--brasa); font-size: 1.5rem; }
  `,
})
export class Acompanhar {
  private api = inject(TotemApi);
  private router = inject(Router);

  protected readonly teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  protected readonly numeros = signal('');
  protected readonly erro = signal<string | null>(null);
  protected readonly buscando = signal(false);
  protected readonly pronto = computed(() => this.numeros().length >= 3);

  protected digitar(tecla: string): void {
    this.erro.set(null);
    this.numeros.update((n) => (n.length < 6 ? n + tecla : n));
  }

  protected apagar(): void {
    this.erro.set(null);
    this.numeros.update((n) => n.slice(0, -1));
  }

  protected teclaFisica(evento: KeyboardEvent): void {
    if (/^\d$/.test(evento.key)) this.digitar(evento.key);
    else if (evento.key === 'Backspace') this.apagar();
  }

  protected async buscar(): Promise<void> {
    if (!this.pronto() || this.buscando()) return;

    const codigo = `A${this.numeros()}`;
    this.buscando.set(true);

    try {
      await firstValueFrom(this.api.acompanhar(codigo));
      await this.router.navigate(['/totem/pedido', codigo]);
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : 'Não encontramos esse pedido.');
    } finally {
      this.buscando.set(false);
    }
  }
}
