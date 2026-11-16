import { Observable } from 'rxjs';
import { Pedido } from './modelos';

export interface FilaCozinha {
  pedidos: Pedido[];
  atualizadoEm: Date;
  /** true quando as atualizações chegam na hora (WebSocket ou simulação). */
  aoVivo: boolean;
}

/**
 * O que a tela da cozinha precisa da API.
 * Implementações: HTTP (API Laravel) e demonstração (pedidos simulados).
 */
export abstract class CozinhaApi {
  /** Pedidos ativos (recebidos, em preparo e prontos). Emite a cada mudança. */
  abstract fila(): Observable<FilaCozinha>;

  abstract avancar(id: number): Observable<Pedido>;

  abstract cancelar(id: number): Observable<Pedido>;

  abstract confirmarPagamento(id: number): Observable<Pedido>;
}
