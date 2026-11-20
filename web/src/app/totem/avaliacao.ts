import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TotemApi } from '../core/totem-api';

const LEGENDAS = ['', 'Muito ruim', 'Ruim', 'Ok', 'Bom', 'Excelente'];

// aparece no acompanhamento quando o pedido fica pronto
@Component({
  selector: 'gt-avaliacao',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (enviada() || jaAvaliado()) {
      <p class="obrigado" role="status">
        <span class="estrelas-fixas" aria-hidden="true">★★★★★</span>
        Obrigado pela avaliação! Ela ajuda a gente a melhorar.
      </p>
    } @else {
      <form class="caixa" (submit)="$event.preventDefault(); enviar()">
        <h2>Como estava seu pedido?</h2>
        <div class="estrelas" role="radiogroup" aria-label="Nota de 1 a 5">
          @for (n of [1, 2, 3, 4, 5]; track n) {
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="nota() === n"
              [attr.aria-label]="n + (n === 1 ? ' estrela' : ' estrelas') + ', ' + legendas[n]"
              [class.acesa]="n <= nota()"
              (click)="nota.set(n)"
            >
              ★
            </button>
          }
          <span class="legenda" aria-hidden="true">{{ legendas[nota()] }}</span>
        </div>

        @if (nota()) {
          <label class="visualmente-oculto" for="comentario">Comentário</label>
          <textarea
            id="comentario"
            rows="2"
            maxlength="280"
            [placeholder]="nota() <= 3 ? 'O que podemos melhorar? (opcional)' : 'Quer deixar um comentário? (opcional)'"
            [value]="comentario()"
            (input)="comentario.set($any($event.target).value)"
          ></textarea>
          @if (erro(); as mensagem) {
            <p class="erro" role="alert">{{ mensagem }}</p>
          }
          <button class="btn btn-tinta" type="submit" [disabled]="enviando()">
            {{ enviando() ? 'Enviando' : 'Enviar avaliação' }}
          </button>
        }
      </form>
    }
  `,
  styles: `
    .caixa { display: grid; gap: var(--espaco-3); padding: var(--espaco-4) var(--espaco-5); border-radius: var(--raio-grande); background: var(--fumaca); }
    h2 { font-size: 1.25rem; font-variation-settings: 'wdth' 100; }
    .estrelas { display: flex; align-items: center; gap: var(--espaco-1); }
    .estrelas button {
      width: 3.25rem; height: 3.25rem; padding: 0; border: 0; background: none;
      font-size: 2.6rem; line-height: 1; color: #c9c5bd; cursor: pointer;
      transition: transform 120ms ease, color 120ms ease;
    }
    .estrelas button.acesa { color: var(--brasa); }
    .estrelas button:active { transform: scale(0.9); }
    .legenda { margin-left: var(--espaco-3); font-weight: 700; }
    textarea {
      width: 100%; padding: var(--espaco-3) var(--espaco-4); resize: none;
      border: 2px solid var(--tinta); border-radius: var(--raio-medio); font: inherit; font-size: 1.05rem;
    }
    .btn { justify-self: start; min-height: 3.25rem; padding-inline: var(--espaco-6); }
    .erro { color: var(--alerta); font-weight: 600; }
    .obrigado { display: grid; justify-items: center; gap: var(--espaco-1); padding: var(--espaco-3); text-align: center; font-weight: 650; }
    .estrelas-fixas { color: var(--brasa); font-size: 1.4rem; letter-spacing: 0.1em; }
    @media (prefers-reduced-motion: reduce) { .estrelas button { transition: none; } }
  `,
})
export class Avaliacao {
  private api = inject(TotemApi);

  readonly codigo = input.required<string>();
  readonly jaAvaliado = input(false);

  protected readonly legendas = LEGENDAS;
  protected readonly nota = signal(0);
  protected readonly comentario = signal('');
  protected readonly enviando = signal(false);
  protected readonly enviada = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected async enviar(): Promise<void> {
    if (!this.nota() || this.enviando()) return;
    this.enviando.set(true);
    this.erro.set(null);
    try {
      await firstValueFrom(this.api.avaliar(this.codigo(), this.nota(), this.comentario().trim() || null));
      this.enviada.set(true);
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : 'Não foi possível enviar. Tente de novo.');
    } finally {
      this.enviando.set(false);
    }
  }
}
