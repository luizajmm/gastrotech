import { inject, Injectable } from '@angular/core';
import { defer, delay, distinctUntilChanged, map, Observable, of, throwError } from 'rxjs';
import { Acompanhamento, Cardapio, NovoPedido } from './modelos';
import { PainelApiDemo } from './painel-api-demo';
import { FalhaPedido, TotemApi } from './totem-api';

@Injectable()
export class TotemApiDemo extends TotemApi {
  private banco = inject(PainelApiDemo);

  cardapio(): Observable<Cardapio> {
    return defer(() => of(this.banco.cardapioTotem())).pipe(delay(200));
  }

  criarPedido(novo: NovoPedido): Observable<Acompanhamento> {
    return defer(() => {
      try {
        return of(this.banco.acompanhamento(this.banco.criarPedidoTotem(novo)));
      } catch (e) {
        const mensagem = e instanceof Error ? e.message : 'Não foi possível concluir o pedido.';
        return throwError(() => new FalhaPedido(mensagem, [mensagem]));
      }
    }).pipe(delay(900)); // tempo de "processar o pagamento"
  }

  acompanhar(codigo: string): Observable<Acompanhamento> {
    return defer(() => {
      const pedido = this.banco.pedidos$.value.find((p) => p.codigo === codigo.trim().toUpperCase());
      return pedido
        ? of(this.banco.acompanhamento(pedido))
        : throwError(() => new FalhaPedido('Não encontramos esse pedido. Confira o código.'));
    }).pipe(delay(200));
  }

  observar(codigo: string): Observable<Acompanhamento> {
    const alvo = codigo.trim().toUpperCase();
    return this.banco.pedidos$.pipe(
      map((pedidos) => {
        const pedido = pedidos.find((p) => p.codigo === alvo);
        if (!pedido) throw new FalhaPedido('Não encontramos esse pedido.');
        return this.banco.acompanhamento(pedido);
      }),
      distinctUntilChanged((a, b) => a.status.valor === b.status.valor && a.status_pagamento.valor === b.status_pagamento.valor),
    );
  }
}
