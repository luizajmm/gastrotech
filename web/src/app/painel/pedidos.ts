import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Avisos } from '../core/avisos';
import { FiltroPedidos, Paginado, Pedido } from '../core/modelos';
import { PainelApi } from '../core/painel-api';
import { Sessao } from '../core/sessao';
import { DinheiroPipe } from '../shared/dinheiro.pipe';
import { seloPagamento, seloStatus } from './formatos';

const FILTROS: { valor: FiltroPedidos['status']; nome: string }[] = [
  { valor: 'todos', nome: 'Todos' },
  { valor: 'recebido', nome: 'Recebidos' },
  { valor: 'em_preparo', nome: 'Em preparo' },
  { valor: 'pronto', nome: 'Prontos' },
  { valor: 'retirado', nome: 'Retirados' },
  { valor: 'cancelado', nome: 'Cancelados' },
];

@Component({
  selector: 'gt-pedidos',
  imports: [DatePipe, DinheiroPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecalho-pagina">
      <div>
        <h1>Pedidos</h1>
        <p>Histórico de tudo que passou pelos totens. A fila ao vivo fica na cozinha.</p>
      </div>
    </header>

    <div class="filtros">
      <div class="abas" role="group" aria-label="Situação">
        @for (f of filtros; track f.valor) {
          <button
            type="button"
            [class.ativa]="filtro().status === f.valor"
            [attr.aria-pressed]="filtro().status === f.valor"
            (click)="mudar({ status: f.valor, pagina: 1 })"
          >
            {{ f.nome }}
          </button>
        }
      </div>
      <form class="busca" role="search" (submit)="$event.preventDefault(); mudar({ busca: termo(), pagina: 1 })">
        <label class="visualmente-oculto" for="busca-pedido">Buscar pedido</label>
        <input
          id="busca-pedido"
          type="search"
          placeholder="Código (A123) ou nome do cliente"
          [value]="termo()"
          (input)="termo.set($any($event.target).value)"
          (search)="mudar({ busca: termo(), pagina: 1 })"
        />
        <button class="btn btn-tinta" type="submit">Buscar</button>
      </form>
    </div>

    <section class="bloco tabela-bloco" [attr.aria-busy]="carregando()">
      @if (pagina(); as p) {
        @if (p.data.length) {
          <div class="rolagem-tabela">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Itens</th>
                  <th class="num">Total</th>
                  <th>Pagamento</th>
                  <th>Situação</th>
                  <th class="num">Data</th>
                  <th><span class="visualmente-oculto">Detalhes</span></th>
                </tr>
              </thead>
              <tbody>
                @for (pedido of p.data; track pedido.id) {
                  <tr [class.aberta]="aberto() === pedido.id">
                    <td><strong>{{ pedido.codigo }}</strong></td>
                    <td>
                      {{ pedido.nome_cliente }}
                      @if (pedido.consumo?.valor === 'viagem') {
                        <span class="selo">Levar</span>
                      }
                    </td>
                    <td class="itens">{{ pedido.itens.length }} {{ pedido.itens.length === 1 ? 'item' : 'itens' }}</td>
                    <td class="num">{{ pedido.subtotal | dinheiro }}</td>
                    <td>
                      {{ pedido.forma_pagamento.rotulo }}
                      <span [class]="seloPagamento(pedido.status_pagamento.valor)">{{ pedido.status_pagamento.rotulo }}</span>
                    </td>
                    <td><span [class]="seloStatus(pedido.status.valor)">{{ pedido.status.rotulo }}</span></td>
                    <td class="num">{{ pedido.criado_em | date: 'dd/MM HH:mm' }}</td>
                    <td class="acoes-linha">
                      <button
                        class="btn btn-pequeno btn-contorno"
                        type="button"
                        [attr.aria-expanded]="aberto() === pedido.id"
                        (click)="aberto.set(aberto() === pedido.id ? null : pedido.id)"
                      >
                        {{ aberto() === pedido.id ? 'Fechar' : 'Ver itens' }}
                      </button>
                    </td>
                  </tr>
                  @if (aberto() === pedido.id) {
                    <tr class="detalhe">
                      <td colspan="8">
                        <ul>
                          @for (item of pedido.itens; track item.id) {
                            <li>
                              <span>
                                <strong>{{ item.quantidade }}× {{ item.nome }}</strong>
                                @for (e of item.personalizacoes; track e.grupo) {
                                  <span class="texto-suave">, {{ e.opcao }}</span>
                                }
                                @if (item.observacao) {
                                  <em> “{{ item.observacao }}”</em>
                                }
                              </span>
                              <span class="preco">{{ item.total | dinheiro }}</span>
                            </li>
                          }
                        </ul>
                        <p class="texto-suave">
                          Feito no {{ pedido.totem ?? 'totem não informado' }}
                          @if (pedido.finalizado_em) {
                            e encerrado às {{ pedido.finalizado_em | date: 'HH:mm' }}
                          }
                        </p>
                        @if (podeCancelar && !encerrado(pedido)) {
                          <div class="cancelar">
                            @if (cancelando() === pedido.id) {
                              <span class="confirmar-inline">
                                <span>
                                  Cancelar o pedido {{ pedido.codigo }}?
                                  @if (pedido.status_pagamento.valor === 'pago') {
                                    O valor vai ser estornado.
                                  }
                                </span>
                                <button class="btn btn-pequeno btn-alerta" type="button" [disabled]="ocupado()" (click)="cancelar(pedido)">
                                  {{ ocupado() ? 'Cancelando' : 'Cancelar pedido' }}
                                </button>
                                <button class="btn btn-pequeno btn-contorno" type="button" [disabled]="ocupado()" (click)="cancelando.set(null)">Voltar</button>
                              </span>
                            } @else {
                              <button class="btn btn-pequeno btn-discreto" type="button" (click)="cancelando.set(pedido.id)">Cancelar pedido</button>
                            }
                          </div>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          <footer class="paginacao">
            <span class="texto-suave">{{ p.meta.total }} pedidos, página {{ p.meta.current_page }} de {{ p.meta.last_page }}</span>
            <div>
              <button class="btn btn-pequeno btn-contorno" type="button" [disabled]="p.meta.current_page <= 1" (click)="mudar({ pagina: p.meta.current_page - 1 })">
                Anterior
              </button>
              <button class="btn btn-pequeno btn-contorno" type="button" [disabled]="p.meta.current_page >= p.meta.last_page" (click)="mudar({ pagina: p.meta.current_page + 1 })">
                Próxima
              </button>
            </div>
          </footer>
        } @else {
          <div class="vazio-painel">
            <p>Nenhum pedido encontrado com esses filtros.</p>
            <button class="btn btn-contorno" type="button" (click)="limpar()">Limpar filtros</button>
          </div>
        }
      } @else {
        <div class="vazio-painel">Carregando pedidos</div>
      }
    </section>
  `,
  styles: `
    .filtros { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--espaco-3); margin-bottom: var(--espaco-4); }
    .abas { display: flex; flex-wrap: wrap; gap: 2px; padding: 3px; border-radius: 999px; background: var(--papel); border: 1px solid var(--linha); }
    .abas button { min-height: 2.2rem; padding: 0 0.85rem; border: 0; border-radius: 999px; background: transparent; font-weight: 600; font-size: 0.85rem; }
    .abas button.ativa { background: var(--tinta); color: var(--papel); }
    .busca { display: flex; gap: var(--espaco-2); flex: 1; max-width: 26rem; min-width: min(100%, 16rem); }
    .tabela-bloco { padding: var(--espaco-2) var(--espaco-4); }
    .tabela td .selo { margin-left: 0.3rem; }
    .tabela td:nth-child(6) .selo { margin-left: 0; }
    .itens { color: var(--grafite); white-space: nowrap; }
    tr.aberta td { border-bottom-color: transparent; background: #faf9f7; }
    tr.detalhe td { background: #faf9f7; padding-top: 0; }
    tr.detalhe ul { display: grid; gap: 0.4rem; margin: 0 0 0.5rem; padding: 0.75rem 1rem; list-style: none; border-left: 3px solid var(--tinta); background: var(--papel); border-radius: 0 8px 8px 0; }
    tr.detalhe li { display: flex; justify-content: space-between; gap: var(--espaco-4); }
    tr.detalhe p { font-size: 0.8rem; padding-left: 1rem; }
    .cancelar { padding: 0.5rem 0 0.25rem 1rem; }
    .paginacao { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--espaco-3); padding: var(--espaco-3) 0.75rem var(--espaco-2); border-top: 1px solid var(--linha); }
    .paginacao div { display: flex; gap: var(--espaco-2); }
  `,
})
export class PedidosPagina {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);
  private sessao = inject(Sessao);

  protected readonly podeCancelar = this.sessao.pode('pedidos');
  protected readonly cancelando = signal<number | null>(null);
  protected readonly ocupado = signal(false);
  private ultimaBusca = 0;

  protected readonly filtros = FILTROS;
  protected readonly seloStatus = seloStatus;
  protected readonly seloPagamento = seloPagamento;

  protected readonly filtro = signal<FiltroPedidos>({ status: 'todos', busca: '', pagina: 1 });
  protected readonly termo = signal('');
  protected readonly pagina = signal<Paginado<Pedido> | null>(null);
  protected readonly carregando = signal(false);
  protected readonly aberto = signal<number | null>(null);

  constructor() {
    this.carregar();
  }

  protected mudar(parte: Partial<FiltroPedidos>): void {
    this.filtro.update((f) => ({ ...f, ...parte }));
    this.aberto.set(null);
    this.cancelando.set(null);
    this.carregar();
  }

  protected encerrado(pedido: Pedido): boolean {
    return pedido.status.valor === 'retirado' || pedido.status.valor === 'cancelado';
  }

  protected async cancelar(pedido: Pedido): Promise<void> {
    this.ocupado.set(true);
    try {
      await firstValueFrom(this.api.cancelarPedido(pedido.id));
      this.avisos.sucesso(`Pedido ${pedido.codigo} cancelado.`);
      this.cancelando.set(null);
      await this.carregar();
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível cancelar o pedido.');
    } finally {
      this.ocupado.set(false);
    }
  }

  protected limpar(): void {
    this.termo.set('');
    this.mudar({ status: 'todos', busca: '', pagina: 1 });
  }

  private async carregar(): Promise<void> {
    // se clicar rápido em outro filtro, só vale a resposta da última busca
    const busca = ++this.ultimaBusca;
    this.carregando.set(true);
    try {
      const pagina = await firstValueFrom(this.api.pedidos(this.filtro()));
      if (busca === this.ultimaBusca) this.pagina.set(pagina);
    } catch (e) {
      if (busca === this.ultimaBusca) this.avisos.erro(e, 'Não foi possível carregar os pedidos.');
    } finally {
      if (busca === this.ultimaBusca) this.carregando.set(false);
    }
  }
}
