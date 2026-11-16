import { Observable } from 'rxjs';
import { Acompanhamento, Cardapio, NovoPedido } from './modelos';

/**
 * O que a tela do totem precisa da API.
 * Há duas implementações: HTTP (API Laravel de verdade) e demonstração (dados locais).
 * A escolha é feita em app.config.ts, a partir de CONFIG.modoDemonstracao.
 */
export abstract class TotemApi {
  abstract cardapio(): Observable<Cardapio>;

  abstract criarPedido(pedido: NovoPedido): Observable<Acompanhamento>;

  abstract acompanhar(codigo: string): Observable<Acompanhamento>;

  /** Emite o pedido sempre que o status mudar (cozinha avançou, pagamento confirmado...). */
  abstract observar(codigo: string): Observable<Acompanhamento>;
}

/** Erro amigável para mostrar na tela. */
export class FalhaPedido extends Error {
  constructor(
    message: string,
    readonly detalhes: string[] = [],
  ) {
    super(message);
  }
}
