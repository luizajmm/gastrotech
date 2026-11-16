import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, merge, Observable, switchMap, throwError, timer, distinctUntilChanged } from 'rxjs';
import { CONFIG } from '../config';
import { Acompanhamento, Cardapio, ErroApi, NovoPedido } from './modelos';
import { TempoReal } from './tempo-real';
import { FalhaPedido, TotemApi } from './totem-api';

/** Conversa com a API Laravel (rotas /api/totem/...). */
@Injectable()
export class TotemApiHttp extends TotemApi {
  private http = inject(HttpClient);
  private tempoReal = inject(TempoReal);
  private url = `${CONFIG.apiUrl}/totem`;

  cardapio(): Observable<Cardapio> {
    return this.http.get<Cardapio>(`${this.url}/cardapio`).pipe(catchError(traduzirErro));
  }

  criarPedido(pedido: NovoPedido): Observable<Acompanhamento> {
    return this.http
      .post<{ data: Acompanhamento }>(`${this.url}/pedidos`, { ...pedido, totem: CONFIG.totem })
      .pipe(
        map((r) => r.data),
        catchError(traduzirErro),
      );
  }

  acompanhar(codigo: string): Observable<Acompanhamento> {
    return this.http
      .get<{ data: Acompanhamento }>(`${this.url}/pedidos/${encodeURIComponent(codigo)}`)
      .pipe(
        map((r) => r.data),
        catchError(traduzirErro),
      );
  }

  /**
   * Tempo real pelo WebSocket. Também consulta a cada 15 s,
   * caso o servidor de tempo real esteja desligado.
   */
  observar(codigo: string): Observable<Acompanhamento> {
    const aoVivo = this.tempoReal.canalPublico<{ pedido: Acompanhamento }>(`pedido.${codigo}`, 'status.alterado');
    const consulta = timer(0, 15_000).pipe(switchMap(() => this.acompanhar(codigo)));

    return merge(consulta, aoVivo.pipe(map((e) => e.pedido))).pipe(
      distinctUntilChanged((a, b) => a.status.valor === b.status.valor && a.status_pagamento.valor === b.status_pagamento.valor),
    );
  }
}

function traduzirErro(erro: HttpErrorResponse): Observable<never> {
  if (erro.status === 0) {
    return throwError(() => new FalhaPedido('Sem conexão com o sistema. Chame um atendente.'));
  }

  const corpo = erro.error as ErroApi | null;
  const detalhes = Object.values(corpo?.errors ?? {}).flat();

  if (erro.status === 404) {
    return throwError(() => new FalhaPedido('Não encontramos esse pedido. Confira o código.'));
  }

  return throwError(() => new FalhaPedido(detalhes[0] ?? corpo?.message ?? 'Não foi possível concluir. Tente de novo.', detalhes));
}
