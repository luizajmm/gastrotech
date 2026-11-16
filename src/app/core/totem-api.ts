import { Observable } from 'rxjs';
import { Acompanhamento, Cardapio, NovoPedido } from './modelos';

// tem a versão http (api) e a da demonstração, a escolha fica no app.config.ts
export abstract class TotemApi {
  abstract cardapio(): Observable<Cardapio>;

  abstract criarPedido(pedido: NovoPedido): Observable<Acompanhamento>;

  abstract acompanhar(codigo: string): Observable<Acompanhamento>;

  // emite o pedido sempre que o status mudar (cozinha avançou, pagamento confirmado...)
  abstract observar(codigo: string): Observable<Acompanhamento>;
}

export class FalhaPedido extends Error {
  constructor(
    message: string,
    readonly detalhes: string[] = [],
  ) {
    super(message);
  }
}
