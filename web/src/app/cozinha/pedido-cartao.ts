import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Impressao } from '../core/impressao';
import { Pedido } from '../core/modelos';
import { DinheiroPipe } from '../shared/dinheiro.pipe';
import { DuracaoPipe } from '../shared/duracao.pipe';

export type AcaoPedido = 'avancar' | 'cancelar' | 'pagamento';

@Component({
  selector: 'gt-pedido-cartao',
  imports: [DinheiroPipe, DuracaoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pedido-cartao.html',
  styleUrl: './pedido-cartao.css',
  host: {
    // pouco atraso fica laranja; vermelho só quando passou bastante
    '[class.atrasado]': 'atraso() > 0 && !muitoAtrasado()',
    '[class.muito-atrasado]': 'muitoAtrasado()',
    '[class.destacado]': 'destacado()',
    '[class.novo]': 'novo()',
    '[attr.aria-label]': '"Pedido " + pedido().codigo',
    role: 'article',
  },
})
export class PedidoCartao {
  readonly pedido = input.required<Pedido>();
  // em ms, pro cronômetro andar sem recarregar a fila
  readonly agora = input.required<number>();
  readonly novo = input(false);
  readonly ocupado = input(false);
  readonly podeAlterar = input(true);
  // achado pela busca do topo
  readonly destacado = input(false);

  readonly acao = output<AcaoPedido>();

  protected readonly impressao = inject(Impressao);

  protected readonly confirmandoCancelamento = signal(false);
  protected readonly menuAberto = signal(false);

  protected readonly minutos = computed(() =>
    Math.max(0, Math.floor((this.agora() - Date.parse(this.pedido().criado_em)) / 60_000)),
  );

  protected readonly minutosPronto = computed(() => {
    const pronto = this.pedido().pronto_em;
    return pronto ? Math.max(0, Math.floor((this.agora() - Date.parse(pronto)) / 60_000)) : 0;
  });

  protected readonly atraso = computed(() => {
    const status = this.pedido().status.valor;
    if (status !== 'recebido' && status !== 'em_preparo') return 0;
    return Math.max(0, this.minutos() - this.pedido().tempo_estimado_min);
  });

  protected readonly muitoAtrasado = computed(() => this.atraso() >= Math.max(10, this.pedido().tempo_estimado_min / 2));

  protected readonly pendente = computed(() => this.pedido().status_pagamento.valor === 'pendente');

  protected readonly principal = computed<{ texto: string; acao: AcaoPedido }>(() => {
    switch (this.pedido().status.valor) {
      case 'recebido':
        return { texto: 'Começar preparo', acao: 'avancar' };
      case 'em_preparo':
        return { texto: 'Marcar como pronto', acao: 'avancar' };
      default:
        return this.pendente()
          ? { texto: 'Confirmar pagamento', acao: 'pagamento' }
          : { texto: 'Entregar ao cliente', acao: 'avancar' };
    }
  });

  protected cancelar(): void {
    this.confirmandoCancelamento.set(false);
    this.acao.emit('cancelar');
  }
}
