import { Pedido } from '../core/modelos';

/** Classe do selo de situação do pedido (cor + texto, nunca só cor). */
export function seloStatus(status: string): string {
  switch (status) {
    case 'retirado':
      return 'selo selo-ok';
    case 'cancelado':
      return 'selo selo-alerta';
    case 'pronto':
    case 'em_preparo':
    case 'recebido':
      return 'selo selo-brasa';
    default:
      return 'selo selo-neutro';
  }
}

export function seloPagamento(status: string): string {
  return status === 'pago' ? 'selo selo-neutro' : status === 'pendente' ? 'selo selo-brasa' : 'selo selo-alerta';
}

/** "2× Combo Smash, 1× Batata Suprema" */
export function resumoItens(pedido: Pedido): string {
  return pedido.itens.map((i) => `${i.quantidade}× ${i.nome}`).join(', ');
}

/** Data local no formato da API (AAAA-MM-DD). */
export function dataIso(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const diaMes = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

/** "sex" ou "06/11" para o eixo dos gráficos. */
export function rotuloDia(iso: string, curto: boolean): string {
  const d = new Date(`${iso}T12:00:00`);
  return curto ? diaSemana.format(d).replace('.', '') : diaMes.format(d);
}
