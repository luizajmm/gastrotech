import { Observable } from 'rxjs';
import { Pedido } from './modelos';

export interface FilaCozinha {
  pedidos: Pedido[];
  atualizadoEm: Date;
}

// a tela da cozinha usa isso, com a versão da api (http) ou a da demonstração
export abstract class CozinhaApi {
  // pedidos recebidos, em preparo e prontos
  abstract fila(): Observable<FilaCozinha>;

  abstract avancar(id: number): Observable<Pedido>;

  abstract cancelar(id: number): Observable<Pedido>;

  abstract confirmarPagamento(id: number): Observable<Pedido>;
}
