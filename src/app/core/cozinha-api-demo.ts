import { inject, Injectable } from '@angular/core';
import { defer, delay, map, Observable, of, throwError } from 'rxjs';
import { CozinhaApi, FilaCozinha } from './cozinha-api';
import { Pedido } from './modelos';
import { PainelApiDemo } from './painel-api-demo';
import { FalhaPedido } from './totem-api';

/**
 * Cozinha da demonstração: mostra os pedidos do mesmo "banco" do totem e do painel.
 * Um pedido feito no totem aparece aqui na hora.
 */
@Injectable()
export class CozinhaApiDemo extends CozinhaApi {
  private banco = inject(PainelApiDemo);

  fila(): Observable<FilaCozinha> {
    return this.banco.pedidos$.pipe(
      map((pedidos) => ({
        pedidos: pedidos.filter((p) => ['recebido', 'em_preparo', 'pronto'].includes(p.status.valor)),
        atualizadoEm: new Date(),
        aoVivo: true,
      })),
    );
  }

  avancar(id: number): Observable<Pedido> {
    return this.executar(() => this.banco.avancarPedido(id));
  }

  cancelar(id: number): Observable<Pedido> {
    return this.executar(() => this.banco.cancelarPedido(id));
  }

  confirmarPagamento(id: number): Observable<Pedido> {
    return this.executar(() => this.banco.confirmarPagamentoPedido(id));
  }

  private executar(acao: () => Pedido): Observable<Pedido> {
    return defer(() => {
      try {
        return of(acao());
      } catch (e) {
        return throwError(() => new FalhaPedido(e instanceof Error ? e.message : 'Não foi possível atualizar o pedido.'));
      }
    }).pipe(delay(200));
  }
}
