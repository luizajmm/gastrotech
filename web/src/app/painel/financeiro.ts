import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Avisos } from '../core/avisos';
import { Caixa, CaixaAtual, Movimento, Vendas } from '../core/modelos';
import { FalhaFormulario, PainelApi } from '../core/painel-api';
import { Sessao } from '../core/sessao';
import { DinheiroPipe } from '../shared/dinheiro.pipe';
import { baixarPlanilha, Celula, numeroPlanilha } from '../shared/planilha';
import { dataIso, rotuloDia } from './formatos';
import { Barra, GraficoBarras } from './grafico-barras';

type Atalho = 'hoje' | '7' | '30' | 'mes';

const ATALHOS: { valor: Atalho; nome: string }[] = [
  { valor: 'hoje', nome: 'Hoje' },
  { valor: '7', nome: '7 dias' },
  { valor: '30', nome: '30 dias' },
  { valor: 'mes', nome: 'Este mês' },
];

function periodo(atalho: Atalho): { inicio: string; fim: string } {
  const fim = new Date();
  const inicio = new Date();
  if (atalho === '7') inicio.setDate(inicio.getDate() - 6);
  if (atalho === '30') inicio.setDate(inicio.getDate() - 29);
  if (atalho === 'mes') inicio.setDate(1);
  return { inicio: dataIso(inicio), fim: dataIso(fim) };
}

const numero = (texto: string) => Number(texto.replace(/\./g, '').replace(',', '.'));

@Component({
  selector: 'gt-financeiro',
  imports: [DatePipe, DinheiroPipe, GraficoBarras],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './financeiro.html',
  styleUrl: './financeiro.css',
})
export class Financeiro {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);
  protected readonly podeCaixa = inject(Sessao).pode('caixa');

  protected readonly atalhos = ATALHOS;
  protected readonly atalho = signal<Atalho | null>('7');
  protected readonly inicio = signal(periodo('7').inicio);
  protected readonly fim = signal(periodo('7').fim);
  protected readonly vendas = signal<Vendas | null>(null);
  protected readonly erroPeriodo = signal<string | null>(null);

  protected readonly caixa = signal<CaixaAtual | null | undefined>(undefined);
  protected readonly movimentos = signal<Movimento[]>([]);
  protected readonly historico = signal<Caixa[]>([]);

  protected readonly saldoInicial = signal('');
  protected readonly novoMovimento = signal<'entrada' | 'saida' | null>(null);
  protected readonly descricaoMov = signal('');
  protected readonly valorMov = signal('');
  protected readonly errosMov = signal<Record<string, string>>({});
  protected readonly confirmandoFechar = signal(false);
  protected readonly ocupado = signal(false);
  protected readonly exportando = signal(false);

  protected readonly barras = computed<Barra[]>(() => {
    const dias = this.vendas()?.por_dia ?? [];
    const curto = dias.length <= 7;
    const hoje = dataIso(new Date());
    return dias.map((d) => ({
      rotulo: d.data === hoje && curto ? 'hoje' : rotuloDia(d.data, curto),
      valor: d.total,
      detalhe: curto ? `${d.quantidade} ped.` : undefined,
      destaque: d.data === hoje,
    }));
  });

  protected readonly maiorForma = computed(() => Math.max(1, ...(this.vendas()?.por_forma ?? []).map((f) => f.total)));

  constructor() {
    this.carregarVendas();
    this.carregarCaixa();
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected usarAtalho(atalho: Atalho): void {
    const p = periodo(atalho);
    this.atalho.set(atalho);
    this.inicio.set(p.inicio);
    this.fim.set(p.fim);
    this.carregarVendas();
  }

  protected mudarData(campo: 'inicio' | 'fim', valor: string): void {
    if (!valor) return;
    this.atalho.set(null);
    (campo === 'inicio' ? this.inicio : this.fim).set(valor);
    this.carregarVendas();
  }

  protected percentual(parte: number, total: number): number {
    return total ? Math.round((parte / total) * 100) : 0;
  }

  protected async abrirCaixa(): Promise<void> {
    const valor = numero(this.saldoInicial() || '0');
    if (!(valor >= 0)) {
      this.avisos.erro(new Error('Informe quanto há na gaveta, por exemplo 150,00.'));
      return;
    }
    await this.executar(async () => {
      this.caixa.set(await firstValueFrom(this.api.abrirCaixa(valor)));
      this.saldoInicial.set('');
      this.avisos.sucesso('Caixa aberto.');
      await this.carregarCaixa();
    });
  }

  protected async fecharCaixa(): Promise<void> {
    await this.executar(async () => {
      const fechado = await firstValueFrom(this.api.fecharCaixa());
      this.confirmandoFechar.set(false);
      this.avisos.sucesso(`Caixa fechado com ${fechado.resumo.saldo_esperado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
      await this.carregarCaixa();
    });
  }

  protected iniciarMovimento(tipo: 'entrada' | 'saida'): void {
    this.novoMovimento.set(tipo);
    this.descricaoMov.set('');
    this.valorMov.set('');
    this.errosMov.set({});
  }

  protected async registrarMovimento(): Promise<void> {
    const tipo = this.novoMovimento();
    if (!tipo) return;

    const erros: Record<string, string> = {};
    if (!this.descricaoMov().trim()) erros['descricao'] = 'Descreva o movimento.';
    if (!(numero(this.valorMov()) > 0)) erros['valor'] = 'Informe um valor maior que zero.';
    this.errosMov.set(erros);
    if (Object.keys(erros).length) return;

    await this.executar(async () => {
      try {
        await firstValueFrom(
          this.api.registrarMovimento({ tipo, descricao: this.descricaoMov().trim(), valor: numero(this.valorMov()) }),
        );
      } catch (e) {
        if (e instanceof FalhaFormulario && Object.keys(e.campos).length) {
          this.errosMov.set(e.campos);
          return;
        }
        throw e;
      }
      this.avisos.sucesso(tipo === 'entrada' ? 'Entrada registrada.' : 'Saída registrada.');
      this.novoMovimento.set(null);
      await this.carregarCaixa();
    });
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    try {
      await acao();
    } catch (e) {
      this.avisos.erro(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  // planilha pro contador: um pedido pago por linha, no período escolhido
  protected async exportar(): Promise<void> {
    this.exportando.set(true);
    try {
      const pedidos = await firstValueFrom(this.api.pedidosPagos(this.inicio(), this.fim()));
      const total = pedidos.reduce((s, p) => s + p.total, 0);
      const linhas: Celula[][] = [
        ['Data', 'Hora', 'Pedido', 'Cliente', 'Consumo', 'Pagamento', 'Itens', 'Valor (R$)'],
        ...pedidos.map((p) => {
          const pago = new Date(p.pago_em ?? p.criado_em);
          return [
            pago.toLocaleDateString('pt-BR'),
            pago.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            p.codigo,
            p.nome_cliente,
            p.consumo?.rotulo,
            p.forma_pagamento.rotulo,
            p.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(', '),
            numeroPlanilha(p.total),
          ];
        }),
        [],
        ['Total', '', `${pedidos.length} pedidos`, '', '', '', '', numeroPlanilha(total)],
      ];
      baixarPlanilha(`vendas-${this.inicio()}-a-${this.fim()}.csv`, linhas);
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível gerar a planilha.');
    } finally {
      this.exportando.set(false);
    }
  }

  private async carregarVendas(): Promise<void> {
    if (this.fim() < this.inicio()) {
      this.erroPeriodo.set('A data final precisa ser igual ou depois da inicial.');
      return;
    }
    this.erroPeriodo.set(null);
    try {
      this.vendas.set(await firstValueFrom(this.api.vendas(this.inicio(), this.fim())));
    } catch (e) {
      this.erroPeriodo.set(e instanceof Error ? e.message : 'Não foi possível carregar as vendas.');
    }
  }

  private async carregarCaixa(): Promise<void> {
    try {
      const [atual, movimentos, historico] = await Promise.all([
        firstValueFrom(this.api.caixa()),
        firstValueFrom(this.api.movimentos()),
        firstValueFrom(this.api.historicoCaixas()),
      ]);
      this.caixa.set(atual);
      this.movimentos.set(movimentos);
      this.historico.set(historico.filter((c) => c.status.valor === 'fechado').slice(0, 8));
    } catch (e) {
      this.caixa.set(null);
      this.avisos.erro(e, 'Não foi possível carregar o caixa.');
    }
  }
}
