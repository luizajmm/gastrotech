import { Injectable } from '@angular/core';
import { dinheiro } from '../shared/dinheiro.pipe';
import { Acompanhamento, ItemPedido, Pedido } from './modelos';

// monta o papel no tamanho da impressora térmica (80 mm) e imprime por um iframe escondido,
// assim a tela não muda nada. no navegador abre a janela de impressão normal.
@Injectable({ providedIn: 'root' })
export class Impressao {
  comanda(pedido: Pedido): void {
    const consumo = pedido.consumo?.valor === 'viagem' ? '<p class="faixa">PARA LEVAR</p>' : '<p class="faixa leve">COMER AQUI</p>';
    const pagamento =
      pedido.status_pagamento.valor === 'pendente'
        ? `<p class="aviso">PAGAR NO CAIXA: ${dinheiro(pedido.total)}</p>`
        : '';

    this.imprimir(`Comanda ${pedido.codigo}`, `
      <p class="centro pequeno">COMANDA DA COZINHA</p>
      <h1>${esc(pedido.codigo)}</h1>
      <p class="centro">${esc(pedido.nome_cliente || 'Cliente')}</p>
      ${consumo}
      <p class="centro pequeno">${hora(pedido.criado_em)} · previsto ${pedido.tempo_estimado_min} min</p>
      <hr />
      ${pedido.itens.map(itemComanda).join('')}
      <hr />
      ${pagamento}
    `);
  }

  comprovante(pedido: Acompanhamento, nomeLoja: string): void {
    const desconto = pedido.desconto
      ? `<p class="linha"><span>Subtotal</span><span>${dinheiro(pedido.subtotal)}</span></p>
         <p class="linha"><span>Desconto${pedido.cupom ? ` (${esc(pedido.cupom)})` : ''}</span><span>- ${dinheiro(pedido.desconto)}</span></p>`
      : '';

    this.imprimir(`Pedido ${pedido.codigo}`, `
      <p class="centro forte">${esc(nomeLoja)}</p>
      <p class="centro pequeno">${data(pedido.criado_em)}</p>
      <hr />
      <p class="centro pequeno">SEU CÓDIGO</p>
      <h1>${esc(pedido.codigo)}</h1>
      <p class="centro">${esc(pedido.nome_cliente || 'Cliente')} · ${esc(pedido.consumo?.rotulo ?? '')}</p>
      <hr />
      ${pedido.itens.map(itemComprovante).join('')}
      <hr />
      ${desconto}
      <p class="linha forte"><span>TOTAL</span><span>${dinheiro(pedido.total)}</span></p>
      <p class="linha"><span>Pagamento</span><span>${esc(pedido.forma_pagamento.rotulo)} (${esc(pedido.status_pagamento.rotulo.toLowerCase())})</span></p>
      ${pedido.status_pagamento.valor === 'pendente' ? '<p class="aviso">Pague no caixa antes de retirar</p>' : ''}
      <hr />
      <p class="centro pequeno">Acompanhe e avalie seu pedido em</p>
      <p class="centro pequeno forte quebra">${esc(linkPedido(pedido.codigo))}</p>
      <p class="centro pequeno">Não é documento fiscal.</p>
    `);
  }

  private imprimir(titulo: string, corpo: string): void {
    const quadro = document.createElement('iframe');
    quadro.setAttribute('aria-hidden', 'true');
    quadro.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(quadro);

    const doc = quadro.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${ESTILO}</style></head><body>${corpo}</body></html>`);
    doc.close();

    const janela = quadro.contentWindow!;
    const remover = () => setTimeout(() => quadro.remove(), 500);
    janela.addEventListener('afterprint', remover, { once: true });
    setTimeout(() => {
      janela.focus();
      janela.print();
      // alguns navegadores não disparam o afterprint
      setTimeout(remover, 60_000);
    }, 50);
  }
}

function itemComanda(item: ItemPedido): string {
  const escolhas = item.personalizacoes.map((e) => `<li>${esc(e.opcao)}</li>`).join('');
  const obs = item.observacao ? `<li class="obs">OBS: ${esc(item.observacao)}</li>` : '';
  return `<div class="item"><p class="forte grande">${item.quantidade}× ${esc(item.nome)}</p>${escolhas || obs ? `<ul>${escolhas}${obs}</ul>` : ''}</div>`;
}

function itemComprovante(item: ItemPedido): string {
  const escolhas = item.personalizacoes.map((e) => `${esc(e.grupo)}: ${esc(e.opcao)}`).join(', ');
  return `<div class="item"><p class="linha"><span>${item.quantidade}× ${esc(item.nome)}</span><span>${dinheiro(item.total)}</span></p>${escolhas ? `<p class="pequeno">${escolhas}</p>` : ''}</div>`;
}

// o mesmo endereço do sistema, direto na tela do pedido
function linkPedido(codigo: string): string {
  return `${location.origin}${location.pathname}#/totem/pedido/${codigo}`;
}

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function data(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function esc(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const ESTILO = `
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 72mm; font: 12px/1.35 'Courier New', monospace; color: #000; }
  h1 { margin: 2mm 0; font-size: 34px; text-align: center; letter-spacing: 2px; }
  hr { margin: 2.5mm 0; border: 0; border-top: 1px dashed #000; }
  ul { margin: 0.5mm 0 0 4mm; list-style: '- '; }
  .centro { text-align: center; }
  .forte { font-weight: 700; }
  .grande { font-size: 15px; }
  .pequeno { font-size: 10.5px; }
  .item { margin-bottom: 2mm; }
  .obs { font-weight: 700; }
  .quebra { word-break: break-all; }
  .linha { display: flex; justify-content: space-between; gap: 3mm; }
  .linha span:last-child { white-space: nowrap; }
  .faixa { margin: 1.5mm 0; padding: 1mm; background: #000; color: #fff; text-align: center; font-weight: 700; font-size: 15px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .faixa.leve { background: none; color: #000; border: 1px solid #000; }
  .aviso { margin-top: 1.5mm; padding: 1mm; border: 2px solid #000; text-align: center; font-weight: 700; }
`;
