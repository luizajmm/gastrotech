import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, merge, Observable, shareReplay, Subject, switchMap, tap, throwError, timer } from 'rxjs';
import { CONFIG } from '../config';
import { ErroApi, Pedido } from './modelos';
import { FalhaPedido } from './totem-api';

export interface FilaCozinha {
  pedidos: Pedido[];
  atualizadoEm: Date;
}

@Injectable({ providedIn: 'root' })
export class CozinhaApi {
  private http = inject(HttpClient);
  private recarregar = new Subject<void>();

  fila(): Observable<FilaCozinha> {
    // atualiza a cada 5s e logo depois de cada ação
    return merge(timer(0, 5000), this.recarregar).pipe(
      switchMap(() =>
        this.http.get<{ data: Pedido[] }>(`${CONFIG.apiUrl}/pedidos`, { params: { status: 'ativos' } }).pipe(
          catchError(() => []), // se cair a rede, fica a última fila
        ),
      ),
      map((r) => ({ pedidos: r.data, atualizadoEm: new Date() })),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  avancar(id: number): Observable<Pedido> {
    return this.acao(id, 'avancar');
  }

  cancelar(id: number): Observable<Pedido> {
    return this.acao(id, 'cancelar');
  }

  confirmarPagamento(id: number): Observable<Pedido> {
    return this.acao(id, 'pagamento');
  }

  private acao(id: number, rota: string): Observable<Pedido> {
    return this.http.post<{ data: Pedido }>(`${CONFIG.apiUrl}/pedidos/${id}/${rota}`, {}).pipe(
      map((r) => r.data),
      tap(() => this.recarregar.next()),
      catchError((erro: HttpErrorResponse) => {
        const corpo = erro.error as ErroApi | null;
        const detalhe = Object.values(corpo?.errors ?? {}).flat()[0];
        const mensagem =
          erro.status === 0
            ? 'Sem conexão com o sistema.'
            : erro.status === 403
              ? 'Seu usuário não pode alterar pedidos.'
              : (detalhe ?? corpo?.message ?? 'Não foi possível atualizar o pedido.');
        return throwError(() => new FalhaPedido(mensagem));
      }),
    );
  }
}
