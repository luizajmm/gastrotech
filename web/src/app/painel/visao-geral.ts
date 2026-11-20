import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Avisos } from '../core/avisos';
import { Dashboard } from '../core/modelos';
import { PainelApi } from '../core/painel-api';
import { DinheiroPipe } from '../shared/dinheiro.pipe';
import { DuracaoPipe } from '../shared/duracao.pipe';
import { resumoItens, rotuloDia, seloStatus } from './formatos';
import { Barra, GraficoBarras } from './grafico-barras';

const hoje = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

@Component({
  selector: 'gt-visao-geral',
  imports: [DatePipe, DinheiroPipe, DuracaoPipe, GraficoBarras, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visao-geral.html',
  styleUrl: './visao-geral.css',
})
export class VisaoGeral {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);

  protected readonly dados = signal<Dashboard | null>(null);
  protected readonly data = hoje.format(new Date());
  protected readonly resumoItens = resumoItens;
  protected readonly seloStatus = seloStatus;
  protected readonly Math = Math;

  protected readonly semana = computed<Barra[]>(() => {
    const dias = this.dados()?.semana.por_dia ?? [];
    const ultimo = dias.at(-1)?.data;
    return dias.map((d) => ({
      rotulo: d.data === ultimo ? 'hoje' : rotuloDia(d.data, true),
      valor: d.total,
      detalhe: `${d.quantidade} ${d.quantidade === 1 ? 'pago' : 'pagos'}`,
      destaque: d.data === ultimo,
    }));
  });

  protected readonly porHora = computed<Barra[]>(() => {
    const horas = this.dados()?.operacao.por_hora ?? [];
    const maior = Math.max(0, ...horas.map((h) => h.pedidos));
    return horas.map((h) => ({
      rotulo: `${h.hora}h`,
      valor: h.pedidos,
      destaque: maior > 0 && h.pedidos === maior,
    }));
  });

  protected readonly pico = computed(() => {
    const horas = this.dados()?.operacao.por_hora ?? [];
    const maior = Math.max(0, ...horas.map((h) => h.pedidos));
    if (!maior) return null;
    const picos = horas.filter((h) => h.pedidos === maior).map((h) => `${h.hora}h`);
    return picos.slice(0, 2).join(' e ');
  });

  protected readonly formasHoje = computed(() => {
    const d = this.dados();
    if (!d) return [];
    const total = d.hoje.faturamento || 1;
    return d.hoje.por_forma.map((f) => ({ ...f, fatia: (f.total / total) * 100 }));
  });

  protected readonly maiorVendido = computed(() =>
    Math.max(1, ...(this.dados()?.semana.mais_vendidos ?? []).map((m) => m.quantidade)),
  );

  constructor() {
    this.carregar();
    const relogio = setInterval(() => this.carregar(), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(relogio));
  }

  protected async carregar(): Promise<void> {
    try {
      this.dados.set(await firstValueFrom(this.api.dashboard()));
    } catch (e) {
      if (!this.dados()) this.avisos.erro(e, 'Não foi possível carregar a visão geral.');
    }
  }

  protected minutosDesde(iso: string): number {
    return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60_000));
  }
}
