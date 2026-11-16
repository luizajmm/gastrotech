import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  debounceTime,
  map,
  merge,
  Observable,
  shareReplay,
  Subject,
  switchMap,
  tap,
  throwError,
  timer,
} from 'rxjs';
import { CONFIG } from '../config';
import { CozinhaApi, FilaCozinha } from './cozinha-api';
import { ErroApi, Pedido } from './modelos';
import { TempoReal } from './tempo-real';
import { FalhaPedido } from './totem-api';

/** Rotas /api/pedidos da API Laravel + canal privado "cozinha". */
@Injectable()
export class CozinhaApiHttp extends CozinhaApi {
  private http = inject(HttpClient);
  private tempoReal = inject(TempoReal);
  private recarregar = new Subject<void>();
  private aoVivo = false;

  fila(): Observable<FilaCozinha> {
    const eventos = this.tempoReal
      .canalPrivado<{ pedido: Pedido }>('cozinha', ['pedido.criado', 'pedido.atualizado'])
      .pipe(tap(() => (this.aoVivo = true)));

    // Recarrega quando chega evento, depois de cada ação e, por segurança, a cada 20 s.
    return merge(timer(0, 20_000), eventos.pipe(debounceTime(250)), this.recarregar).pipe(
      switchMap(() =>
        this.http.get<{ data: Pedido[] }>(`${CONFIG.apiUrl}/pedidos`, { params: { status: 'ativos' } }).pipe(
          catchError(() => []), // falha de rede: mantém a última fila na tela
        ),
      ),
      map((r) => ({ pedidos: r.data, atualizadoEm: new Date(), aoVivo: this.aoVivo })),
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
