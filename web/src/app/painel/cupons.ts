import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Avisos } from '../core/avisos';
import { ClientesFidelidade, Cupom, TipoCupom } from '../core/modelos';
import { FalhaFormulario, PainelApi } from '../core/painel-api';
import { Sessao } from '../core/sessao';
import { DinheiroPipe } from '../shared/dinheiro.pipe';

@Component({
  selector: 'gt-cupom-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #janela class="janela" aria-labelledby="titulo-cupom" (cancel)="$event.preventDefault(); fechar.emit()" (click)="cliqueNoFundo($event)">
      <header class="janela-topo">
        <h2 id="titulo-cupom">{{ cupom() ? 'Editar ' + cupom()!.codigo : 'Novo cupom' }}</h2>
        <button class="btn btn-icone btn-contorno" type="button" aria-label="Fechar" (click)="fechar.emit()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      <form class="janela-corpo" id="form-cupom" (submit)="$event.preventDefault(); salvar()" novalidate>
        <div class="grade-campos">
          <div class="campo">
            <label for="c-codigo">Código</label>
            <input
              id="c-codigo"
              autocomplete="off"
              maxlength="30"
              class="maiusculo"
              placeholder="EX: BEMVINDO10"
              [class.invalido]="erros()['codigo']"
              [value]="codigo()"
              (input)="codigo.set(valor($event).toUpperCase())"
            />
            @if (erros()['codigo']) {
              <span class="erro-campo">{{ erros()['codigo'] }}</span>
            } @else {
              <span class="ajuda">O que o cliente digita no totem.</span>
            }
          </div>
          <div class="campo">
            <label for="c-descricao">Descrição</label>
            <input id="c-descricao" maxlength="120" placeholder="10% no primeiro pedido" [value]="descricao()" (input)="descricao.set(valor($event))" />
            <span class="ajuda">Aparece pro cliente quando aplica.</span>
          </div>
        </div>

        <fieldset class="tipos">
          <legend>Tipo de desconto</legend>
          <label class="tipo" [class.marcado]="tipo() === 'percentual'">
            <input type="radio" name="tipo" [checked]="tipo() === 'percentual'" (change)="tipo.set('percentual')" />
            <span><strong>Porcentagem</strong><span class="texto-suave">Ex.: 10% do pedido</span></span>
          </label>
          <label class="tipo" [class.marcado]="tipo() === 'valor'">
            <input type="radio" name="tipo" [checked]="tipo() === 'valor'" (change)="tipo.set('valor')" />
            <span><strong>Valor fixo</strong><span class="texto-suave">Ex.: R$ 5,00 a menos</span></span>
          </label>
        </fieldset>

        <div class="grade-campos">
          <div class="campo">
            <label for="c-valor">{{ tipo() === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)' }}</label>
            <input id="c-valor" inputmode="decimal" [class.invalido]="erros()['valor']" [value]="valorDesconto()" (input)="valorDesconto.set(valor($event))" />
            @if (erros()['valor']) {
              <span class="erro-campo">{{ erros()['valor'] }}</span>
            }
          </div>
          <div class="campo">
            <label for="c-minimo">Pedido mínimo (R$)</label>
            <input id="c-minimo" inputmode="decimal" placeholder="Sem mínimo" [class.invalido]="erros()['pedido_minimo']" [value]="minimo()" (input)="minimo.set(valor($event))" />
            @if (erros()['pedido_minimo']) {
              <span class="erro-campo">{{ erros()['pedido_minimo'] }}</span>
            }
          </div>
          <div class="campo">
            <label for="c-validade">Vale até</label>
            <input id="c-validade" type="date" [class.invalido]="erros()['validade']" [value]="validade()" (change)="validade.set(valor($event))" />
            <span class="ajuda">Em branco: sem data pra acabar.</span>
          </div>
          <div class="campo">
            <label for="c-limite">Limite de usos</label>
            <input id="c-limite" type="number" min="1" placeholder="Sem limite" [class.invalido]="erros()['limite_usos']" [value]="limite()" (input)="limite.set(valor($event))" />
            @if (erros()['limite_usos']) {
              <span class="erro-campo">{{ erros()['limite_usos'] }}</span>
            }
          </div>
        </div>

        <label class="interruptor"><input type="checkbox" [checked]="ativo()" (change)="ativo.set(!ativo())" /> Valendo no totem</label>
      </form>

      <footer class="janela-rodape">
        @if (erroGeral(); as mensagem) {
          <span class="erro-geral" role="alert">{{ mensagem }}</span>
        }
        <button class="btn btn-contorno" type="button" (click)="fechar.emit()">Cancelar</button>
        <button class="btn btn-tinta" type="submit" form="form-cupom" [disabled]="salvando()">
          {{ salvando() ? 'Salvando' : cupom() ? 'Salvar alterações' : 'Criar cupom' }}
        </button>
      </footer>
    </dialog>
  `,
  styles: `
    .janela { width: min(100% - 2rem, 40rem); }
    .maiusculo { text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
    .maiusculo::placeholder { font-weight: 400; letter-spacing: 0; }
    .tipos { display: grid; grid-template-columns: 1fr 1fr; gap: var(--espaco-2); margin: 0; padding: 0; border: 0; }
    .tipos legend { margin-bottom: var(--espaco-2); font-weight: 650; font-size: 0.85rem; }
    .tipo {
      display: flex; align-items: flex-start; gap: var(--espaco-3); padding: 0.7rem 0.9rem;
      border: 1px solid var(--linha); border-radius: 10px; cursor: pointer;
    }
    .tipo > span { display: grid; }
    .tipo .texto-suave { font-size: 0.82rem; }
    .tipo input { margin-top: 0.25rem; accent-color: var(--tinta); }
    .tipo.marcado { border-color: transparent; box-shadow: var(--traco-triplo); }
    @media (max-width: 560px) { .tipos { grid-template-columns: 1fr; } }
  `,
})
export class CupomFormJanela implements OnInit {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);

  readonly cupom = input<Cupom | null>(null);
  readonly fechar = output<void>();
  readonly salvo = output<void>();

  private janela = viewChild.required<ElementRef<HTMLDialogElement>>('janela');

  protected readonly codigo = signal('');
  protected readonly descricao = signal('');
  protected readonly tipo = signal<TipoCupom>('percentual');
  protected readonly valorDesconto = signal('');
  protected readonly minimo = signal('');
  protected readonly validade = signal('');
  protected readonly limite = signal('');
  protected readonly ativo = signal(true);
  protected readonly erros = signal<Record<string, string>>({});
  protected readonly erroGeral = signal<string | null>(null);
  protected readonly salvando = signal(false);

  constructor() {
    afterNextRender(() => this.janela().nativeElement.showModal());
  }

  ngOnInit(): void {
    const c = this.cupom();
    if (!c) return;
    this.codigo.set(c.codigo);
    this.descricao.set(c.descricao ?? '');
    this.tipo.set(c.tipo.valor);
    this.valorDesconto.set(numeroBr(c.valor));
    this.minimo.set(c.pedido_minimo === null ? '' : numeroBr(c.pedido_minimo));
    this.validade.set(c.validade ?? '');
    this.limite.set(c.limite_usos === null ? '' : String(c.limite_usos));
    this.ativo.set(c.ativo);
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected cliqueNoFundo(evento: MouseEvent): void {
    if (evento.target === this.janela().nativeElement) this.fechar.emit();
  }

  protected async salvar(): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erros.set({});
    this.erroGeral.set(null);

    try {
      await firstValueFrom(
        this.api.salvarCupom(
          {
            codigo: this.codigo().trim(),
            descricao: this.descricao().trim() || null,
            tipo: this.tipo(),
            valor: lerNumero(this.valorDesconto()) ?? 0,
            pedido_minimo: lerNumero(this.minimo()),
            validade: this.validade() || null,
            limite_usos: this.limite().trim() ? Math.round(Number(this.limite())) : null,
            ativo: this.ativo(),
          },
          this.cupom()?.id,
        ),
      );
      this.avisos.sucesso(this.cupom() ? 'Cupom atualizado.' : `Cupom ${this.codigo().trim()} criado.`);
      this.salvo.emit();
    } catch (e) {
      const campos = e instanceof FalhaFormulario ? e.campos : {};
      this.erros.set(campos);
      this.erroGeral.set(
        Object.keys(campos).length ? 'Confira os campos destacados.' : e instanceof Error ? e.message : 'Não foi possível salvar.',
      );
    } finally {
      this.salvando.set(false);
    }
  }
}

@Component({
  selector: 'gt-cupons',
  imports: [CupomFormJanela, DatePipe, DinheiroPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecalho-pagina">
      <div>
        <h1>Promoções</h1>
        <p>Cupons de desconto e o cartão fidelidade que o cliente usa no totem.</p>
      </div>
      @if (pode) {
        <div class="acoes">
          <button class="btn btn-tinta" type="button" (click)="editando.set(null)">Novo cupom</button>
        </div>
      }
    </header>

    <section class="bloco tabela-bloco">
      <h2 class="titulo-bloco">Cupons</h2>
      @if (cupons(); as lista) {
        @if (lista.length) {
          <div class="rolagem-tabela">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Cupom</th>
                  <th>Desconto</th>
                  <th>Regras</th>
                  <th class="num">Usos</th>
                  <th>Situação</th>
                  <th><span class="visualmente-oculto">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (c of lista; track c.id) {
                  <tr>
                    <td>
                      <strong class="codigo">{{ c.codigo }}</strong>
                      @if (c.descricao) {
                        <span class="texto-suave">{{ c.descricao }}</span>
                      }
                    </td>
                    <td><strong>{{ c.tipo.valor === 'percentual' ? c.valor + '%' : (c.valor | dinheiro) }}</strong></td>
                    <td class="regras">
                      <span>{{ c.pedido_minimo ? 'A partir de ' + (c.pedido_minimo | dinheiro) : 'Qualquer valor' }}</span>
                      <span class="texto-suave">{{ c.validade ? 'Até ' + (c.validade + 'T12:00' | date: 'dd/MM/yyyy') : 'Sem validade' }}</span>
                    </td>
                    <td class="num">{{ c.usos }}{{ c.limite_usos ? ' de ' + c.limite_usos : '' }}</td>
                    <td><span [class]="situacao(c).classe">{{ situacao(c).texto }}</span></td>
                    <td class="acoes-linha">
                      @if (pode) {
                        @if (excluindo() === c.id) {
                          <span class="confirmar-inline">
                            <span>{{ c.usos ? 'Desativar' : 'Excluir' }} {{ c.codigo }}?</span>
                            <button class="btn btn-pequeno btn-alerta" type="button" (click)="excluir(c)">{{ c.usos ? 'Desativar' : 'Excluir' }}</button>
                            <button class="btn btn-pequeno btn-contorno" type="button" (click)="excluindo.set(null)">Voltar</button>
                          </span>
                        } @else {
                          <button class="btn btn-pequeno btn-contorno" type="button" (click)="editando.set(c)">Editar</button>
                          @if (c.ativo || !c.usos) {
                            <button class="btn btn-pequeno btn-discreto" type="button" (click)="excluindo.set(c.id)">{{ c.usos ? 'Desativar' : 'Excluir' }}</button>
                          }
                        }
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="vazio-painel">Nenhum cupom ainda. Crie um pra fazer uma promoção no totem.</div>
        }
      } @else {
        <div class="vazio-painel">Carregando os cupons</div>
      }
    </section>

    <section class="bloco tabela-bloco fidelidade">
      <div class="bloco-topo titulo-bloco">
        <h2>Cartão fidelidade</h2>
        @if (fidelidade(); as f) {
          <span class="texto-suave">
            @if (f.regras.ativa) {
              A cada {{ f.regras.meta }} pedidos, {{ f.regras.premio | dinheiro }} de desconto · {{ f.total }} {{ f.total === 1 ? 'cliente' : 'clientes' }}
            } @else {
              Desligado no totem
            }
          </span>
        }
      </div>
      @if (fidelidade(); as f) {
        @if (f.clientes.length) {
          <div class="rolagem-tabela">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Celular</th>
                  <th>Selos</th>
                  <th class="num">Pedidos</th>
                  <th class="num">Prêmios trocados</th>
                  <th class="num">Último pedido</th>
                </tr>
              </thead>
              <tbody>
                @for (c of f.clientes; track c.id) {
                  <tr>
                    <td>{{ c.telefone }}</td>
                    <td>
                      <strong>{{ c.selos }} de {{ f.regras.meta }}</strong>
                      @if (c.selos >= f.regras.meta) {
                        <span class="selo selo-brasa">pode trocar</span>
                      }
                    </td>
                    <td class="num">{{ c.pedidos }}</td>
                    <td class="num">{{ c.resgates }}</td>
                    <td class="num">{{ c.ultimo_pedido_em ? (c.ultimo_pedido_em | date: 'dd/MM HH:mm') : '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="nota-fidelidade texto-suave">O celular aparece escondido. As regras ficam em Configurações.</p>
        } @else {
          <div class="vazio-painel">Ninguém usou o cartão fidelidade ainda.</div>
        }
      } @else {
        <div class="vazio-painel">Carregando</div>
      }
    </section>

    @if (editando() !== undefined) {
      <gt-cupom-form [cupom]="editando() ?? null" (fechar)="editando.set(undefined)" (salvo)="salvou()" />
    }
  `,
  styles: `
    .tabela-bloco { padding: var(--espaco-2) var(--espaco-4); }
    .codigo { display: block; letter-spacing: 0.05em; }
    td .texto-suave { display: block; font-size: 0.8rem; }
    .regras span:first-child { display: block; }
    .titulo-bloco { margin: var(--espaco-3) 0 var(--espaco-2); }
    h2.titulo-bloco, .titulo-bloco h2 { font-size: 1.1rem; }
    .fidelidade { margin-top: var(--espaco-4); }
    .fidelidade .selo { margin-left: var(--espaco-2); }
    .nota-fidelidade { margin: var(--espaco-3) 0 var(--espaco-2); font-size: 0.8rem; }
  `,
})
export class Cupons {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);

  protected readonly pode = inject(Sessao).pode('cardapio');
  protected readonly cupons = signal<Cupom[] | null>(null);
  protected readonly editando = signal<Cupom | null | undefined>(undefined);
  protected readonly excluindo = signal<number | null>(null);
  protected readonly fidelidade = signal<ClientesFidelidade | null>(null);

  constructor() {
    this.carregar();
    firstValueFrom(this.api.clientesFidelidade())
      .then((f) => this.fidelidade.set(f))
      .catch((e) => this.avisos.erro(e, 'Não foi possível carregar o cartão fidelidade.'));
  }

  protected situacao(c: Cupom): { texto: string; classe: string } {
    if (!c.ativo) return { texto: 'Desativado', classe: 'selo selo-neutro' };
    if (c.validade && c.validade < hojeIso()) return { texto: 'Vencido', classe: 'selo selo-alerta' };
    if (c.limite_usos && c.usos >= c.limite_usos) return { texto: 'Esgotado', classe: 'selo selo-alerta' };
    return { texto: 'Valendo', classe: 'selo selo-ok' };
  }

  protected salvou(): void {
    this.editando.set(undefined);
    this.carregar();
  }

  protected async excluir(cupom: Cupom): Promise<void> {
    try {
      await firstValueFrom(this.api.excluirCupom(cupom.id));
      this.avisos.sucesso(cupom.usos ? `${cupom.codigo} foi desativado.` : `${cupom.codigo} foi excluído.`);
    } catch (e) {
      this.avisos.erro(e);
    } finally {
      this.excluindo.set(null);
      this.carregar();
    }
  }

  private async carregar(): Promise<void> {
    try {
      this.cupons.set(await firstValueFrom(this.api.cupons()));
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível carregar os cupons.');
    }
  }
}

function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function numeroBr(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
}

function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/\s|R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : NaN;
}
