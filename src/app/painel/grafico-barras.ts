import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DinheiroPipe } from '../shared/dinheiro.pipe';

export interface Barra {
  rotulo: string;
  valor: number;
  detalhe?: string;
  destaque?: boolean;
}

/**
 * Colunas verticais em escala (altura = valor ÷ maior valor).
 * Feito em HTML para acompanhar a largura da tela sem distorcer o texto.
 */
@Component({
  selector: 'gt-grafico-barras',
  imports: [DinheiroPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grafico" [class.denso]="denso()" role="img" [attr.aria-label]="descricao()">
      <div class="eixo" aria-hidden="true">
        <span>{{ teto() | dinheiro }}</span>
        <span>{{ teto() / 2 | dinheiro }}</span>
        <span>R$ 0</span>
      </div>
      <div class="area">
        <div class="guias" aria-hidden="true"><span></span><span></span><span></span></div>
        @for (barra of barras(); track $index; let i = $index, ultimo = $last) {
          <div class="coluna" [class.destaque]="barra.destaque" [title]="barra.rotulo + ': ' + (barra.valor | dinheiro)">
            <div class="barra" [style.height.%]="teto() ? (barra.valor / teto()) * 100 : 0">
              @if (barra.valor && !denso()) {
                <span class="valor">{{ barra.valor | dinheiro }}</span>
              }
            </div>
            <span class="rotulo">{{ denso() && i % passo() !== 0 && !ultimo ? '' : barra.rotulo }}</span>
            @if (barra.detalhe) {
              <span class="detalhe">{{ barra.detalhe }}</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .grafico { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--espaco-3); }
    .eixo {
      display: flex; flex-direction: column; justify-content: space-between;
      height: 12rem; color: var(--grafite); font-size: 0.72rem; text-align: right;
      font-variant-numeric: tabular-nums; transform: translateY(-0.45em);
    }
    .area { position: relative; display: flex; align-items: flex-start; gap: var(--espaco-2); }
    .guias { position: absolute; inset: 0 0 auto; height: 12rem; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
    .guias span { border-top: 1px dashed var(--linha); }
    .guias span:last-child { border-top: 1px solid var(--tinta); }
    .coluna { position: relative; flex: 1 1 0; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: 12rem auto auto; justify-items: center; min-width: 0; }
    .barra {
      position: relative;
      grid-row: 1; align-self: end; width: min(100%, 3.25rem); min-height: 2px;
      border-radius: 6px 6px 0 0; background: var(--tinta);
      transition: height 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .destaque .barra { background: var(--brasa); }
    .valor {
      position: absolute; bottom: calc(100% + 0.2rem); left: 50%; transform: translateX(-50%);
      font-size: 0.7rem; font-weight: 650; white-space: nowrap; font-variant-numeric: tabular-nums;
    }
    .rotulo { min-height: 1.2em; margin-top: 0.4rem; font-size: 0.78rem; font-weight: 650; }
    .detalhe { color: var(--grafite); font-size: 0.7rem; }
    .denso .area { gap: 2px; }
    .denso .barra { border-radius: 3px 3px 0 0; }
    .denso .rotulo { font-weight: 500; font-size: 0.7rem; white-space: nowrap; }
    .denso .coluna:last-child .rotulo { justify-self: end; }
    @media (max-width: 600px) { .valor { display: none; } }
  `,
})
export class GraficoBarras {
  readonly barras = input.required<Barra[]>();

  /** Mais de 10 colunas: esconde os valores e mostra só alguns dias no eixo. */
  protected readonly denso = computed(() => this.barras().length > 10);
  protected readonly passo = computed(() => Math.ceil(this.barras().length / 6));

  /** Teto do eixo arredondado para um número "redondo", sempre acima do maior valor. */
  protected readonly teto = computed(() => {
    const maior = Math.max(0, ...this.barras().map((b) => b.valor));
    if (!maior) return 100;
    const passo = 10 ** Math.floor(Math.log10(maior));
    return Math.ceil(maior / passo) * passo;
  });

  protected readonly descricao = computed(() =>
    this.barras()
      .map((b) => `${b.rotulo}: R$ ${b.valor.toFixed(2).replace('.', ',')}`)
      .join('; '),
  );
}
