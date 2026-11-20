import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, distinctUntilChanged, map, Observable, switchMap, throwError, timer } from 'rxjs';
import { CONFIG } from '../config';
import { Acompanhamento, Cardapio, ConsultaFidelidade, CupomAplicado, ErroApi, NovoPedido } from './modelos';

export class FalhaPedido extends Error {
  constructor(
    message: string,
    readonly detalhes: string[] = [],
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class TotemApi {
  private http = inject(HttpClient);
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

  conferirCupom(codigo: string, subtotal: number): Observable<CupomAplicado> {
    return this.http
      .get<{ data: CupomAplicado }>(`${this.url}/cupons/${encodeURIComponent(codigo.trim())}`, { params: { subtotal } })
      .pipe(
        map((r) => r.data),
        catchError(traduzirErro),
      );
  }

  consultarFidelidade(telefone: string): Observable<ConsultaFidelidade> {
    return this.http
      .get<{ data: ConsultaFidelidade }>(`${this.url}/fidelidade/${encodeURIComponent(telefone.replace(/\D/g, ''))}`)
      .pipe(
        map((r) => r.data),
        catchError(traduzirErro),
      );
  }

  avaliar(codigo: string, nota: number, comentario: string | null): Observable<Acompanhamento> {
    return this.http
      .post<{ data: Acompanhamento }>(`${this.url}/pedidos/${encodeURIComponent(codigo)}/avaliacao`, { nota, comentario })
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

  observar(codigo: string): Observable<Acompanhamento> {
    return timer(0, 5000).pipe(
      switchMap(() => this.acompanhar(codigo)),
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
