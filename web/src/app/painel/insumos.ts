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
import { Insumo, UnidadeInsumo } from '../core/modelos';
import { FalhaFormulario, PainelApi } from '../core/painel-api';
import { Sessao } from '../core/sessao';

export const UNIDADES: { valor: UnidadeInsumo; nome: string }[] = [
  { valor: 'un', nome: 'unidade' },
  { valor: 'g', nome: 'grama' },
  { valor: 'kg', nome: 'quilo' },
  { valor: 'ml', nome: 'mililitro' },
  { valor: 'l', nome: 'litro' },
];

export function quantidadeBr(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('pt-BR') : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

export function lerQuantidade(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!limpo) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : NaN;
}

@Component({
  selector: 'gt-insumo-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #janela class="janela" aria-labelledby="titulo-insumo" (cancel)="$event.preventDefault(); fechar.emit()" (click)="cliqueNoFundo($event)">
      <header class="janela-topo">
        <h2 id="titulo-insumo">{{ insumo() ? 'Editar ' + insumo()!.nome : 'Novo insumo' }}</h2>
        <button class="btn btn-icone btn-contorno" type="button" aria-label="Fechar" (click)="fechar.emit()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      <form class="janela-corpo" id="form-insumo" (submit)="$event.preventDefault(); salvar()" novalidate>
        <div class="grade-campos">
          <div class="campo largo">
            <label for="i-nome">Nome</label>
            <input id="i-nome" maxlength="80" placeholder="Pão brioche" [class.invalido]="erros()['nome']" [value]="nome()" (input)="nome.set(valor($event))" />
            @if (erros()['nome']) {
              <span class="erro-campo">{{ erros()['nome'] }}</span>
            }
          </div>
          <div class="campo">
            <label for="i-unidade">Medida</label>
            <select id="i-unidade" [value]="unidade()" (change)="unidade.set($any($event.target).value)">
              @for (u of unidades; track u.valor) {
                <option [value]="u.valor" [selected]="unidade() === u.valor">{{ u.nome }} ({{ u.valor }})</option>
              }
            </select>
          </div>
          <div class="campo">
            <label for="i-estoque">Estoque agora ({{ unidade() }})</label>
            <input id="i-estoque" inputmode="decimal" [class.invalido]="erros()['estoque']" [value]="estoque()" (input)="estoque.set(valor($event))" />
            @if (erros()['estoque']) {
              <span class="erro-campo">{{ erros()['estoque'] }}</span>
            }
          </div>
          <div class="campo">
            <label for="i-minimo">Avisar quando chegar em ({{ unidade() }})</label>
            <input id="i-minimo" inputmode="decimal" placeholder="Sem aviso" [class.invalido]="erros()['estoque_minimo']" [value]="minimo()" (input)="minimo.set(valor($event))" />
            <span class="ajuda">Aparece em Estoque baixo na visão geral.</span>
          </div>
        </div>
      </form>

      <footer class="janela-rodape">
        @if (erroGeral(); as mensagem) {
          <span class="erro-geral" role="alert">{{ mensagem }}</span>
        }
        <button class="btn btn-contorno" type="button" (click)="fechar.emit()">Cancelar</button>
        <button class="btn btn-tinta" type="submit" form="form-insumo" [disabled]="salvando()">
          {{ salvando() ? 'Salvando' : insumo() ? 'Salvar alterações' : 'Cadastrar insumo' }}
        </button>
      </footer>
    </dialog>
  `,
  styles: `.janela { width: min(100% - 2rem, 34rem); }`,
})
export class InsumoFormJanela implements OnInit {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);

  readonly insumo = input<Insumo | null>(null);
  readonly fechar = output<void>();
  readonly salvo = output<void>();

  private janela = viewChild.required<ElementRef<HTMLDialogElement>>('janela');

  protected readonly unidades = UNIDADES;
  protected readonly nome = signal('');
  protected readonly unidade = signal<UnidadeInsumo>('un');
  protected readonly estoque = signal('0');
  protected readonly minimo = signal('');
  protected readonly erros = signal<Record<string, string>>({});
  protected readonly erroGeral = signal<string | null>(null);
  protected readonly salvando = signal(false);

  constructor() {
    afterNextRender(() => this.janela().nativeElement.showModal());
  }

  ngOnInit(): void {
    const i = this.insumo();
    if (!i) return;
    this.nome.set(i.nome);
    this.unidade.set(i.unidade);
    this.estoque.set(quantidadeBr(i.estoque));
    this.minimo.set(i.estoque_minimo === null ? '' : quantidadeBr(i.estoque_minimo));
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
        this.api.salvarInsumo(
          {
            nome: this.nome().trim(),
            unidade: this.unidade(),
            estoque: lerQuantidade(this.estoque()) ?? 0,
            estoque_minimo: lerQuantidade(this.minimo()),
          },
          this.insumo()?.id,
        ),
      );
      this.avisos.sucesso(this.insumo() ? 'Insumo atualizado.' : `${this.nome().trim()} cadastrado.`);
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
  selector: 'gt-insumos',
  imports: [InsumoFormJanela],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecalho-pagina">
      <div>
        <h1>Insumos</h1>
        <p>O que vai nos lanches. Cada pedido desconta pela ficha técnica do produto.</p>
      </div>
      @if (pode) {
        <div class="acoes">
          <button class="btn btn-tinta" type="button" (click)="editando.set(null)">Novo insumo</button>
        </div>
      }
    </header>

    <section class="bloco tabela-bloco">
      @if (insumos(); as lista) {
        @if (lista.length) {
          <div class="rolagem-tabela">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th class="num">Estoque</th>
                  <th class="num">Aviso em</th>
                  <th>Usado em</th>
                  <th><span class="visualmente-oculto">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (i of lista; track i.id) {
                  <tr>
                    <td>
                      <strong>{{ i.nome }}</strong>
                      @if (i.acabando) {
                        <span class="selo selo-alerta">acabando</span>
                      }
                    </td>
                    <td class="num"><strong>{{ formatar(i.estoque) }} {{ i.unidade }}</strong></td>
                    <td class="num texto-suave">{{ i.estoque_minimo === null ? '—' : formatar(i.estoque_minimo) + ' ' + i.unidade }}</td>
                    <td class="usado">{{ i.usado_em?.length ? i.usado_em!.join(', ') : 'Nenhuma ficha ainda' }}</td>
                    <td class="acoes-linha">
                      @if (pode) {
                        @if (entrando() === i.id) {
                          <form class="entrada" (submit)="$event.preventDefault(); registrarEntrada(i)">
                            <label class="visualmente-oculto" [for]="'entrada-' + i.id">Quantidade que chegou</label>
                            <input [id]="'entrada-' + i.id" inputmode="decimal" [placeholder]="'+ ' + i.unidade" [value]="quantidadeEntrada()" (input)="quantidadeEntrada.set($any($event.target).value)" />
                            <button class="btn btn-pequeno btn-tinta" type="submit">Somar</button>
                            <button class="btn btn-pequeno btn-discreto" type="button" (click)="entrando.set(null)">Voltar</button>
                          </form>
                        } @else if (excluindo() === i.id) {
                          <span class="confirmar-inline">
                            <span>Excluir {{ i.nome }}?</span>
                            <button class="btn btn-pequeno btn-alerta" type="button" (click)="excluir(i)">Excluir</button>
                            <button class="btn btn-pequeno btn-contorno" type="button" (click)="excluindo.set(null)">Voltar</button>
                          </span>
                        } @else {
                          <button class="btn btn-pequeno btn-tinta" type="button" (click)="entrando.set(i.id); quantidadeEntrada.set('')">Entrada</button>
                          <button class="btn btn-pequeno btn-contorno" type="button" (click)="editando.set(i)">Editar</button>
                          @if (!i.usado_em?.length) {
                            <button class="btn btn-pequeno btn-discreto" type="button" (click)="excluindo.set(i.id)">Excluir</button>
                          }
                        }
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="nota-insumos texto-suave">"Entrada" soma o que chegou do fornecedor. A ficha de cada produto fica no cadastro dele, em Cardápio.</p>
        } @else {
          <div class="vazio-painel">Nenhum insumo ainda. Cadastre pão, carne, queijo... e monte a ficha nos produtos.</div>
        }
      } @else {
        <div class="vazio-painel">Carregando os insumos</div>
      }
    </section>

    @if (editando() !== undefined) {
      <gt-insumo-form [insumo]="editando() ?? null" (fechar)="editando.set(undefined)" (salvo)="salvou()" />
    }
  `,
  styles: `
    .tabela-bloco { padding: var(--espaco-2) var(--espaco-4); }
    td .selo { margin-left: var(--espaco-2); }
    .acoes-linha { white-space: nowrap; }
    .acoes-linha > .btn + .btn { margin-left: var(--espaco-2); }
    .usado { max-width: 22rem; color: var(--grafite); font-size: 0.85rem; }
    .entrada { display: inline-flex; align-items: center; gap: var(--espaco-2); }
    .entrada input { width: 6.5rem; min-height: 2.2rem; padding: 0 var(--espaco-2); border: 1px solid var(--linha); border-radius: 8px; font: inherit; }
    .nota-insumos { margin: var(--espaco-3) 0 var(--espaco-2); font-size: 0.8rem; }
  `,
})
export class Insumos implements OnInit {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);

  protected readonly pode = inject(Sessao).pode('cardapio');
  protected readonly insumos = signal<Insumo[] | null>(null);
  protected readonly editando = signal<Insumo | null | undefined>(undefined);
  protected readonly excluindo = signal<number | null>(null);
  protected readonly entrando = signal<number | null>(null);
  protected readonly quantidadeEntrada = signal('');
  protected readonly formatar = quantidadeBr;

  ngOnInit(): void {
    this.carregar();
  }

  protected salvou(): void {
    this.editando.set(undefined);
    this.carregar();
  }

  protected async registrarEntrada(insumo: Insumo): Promise<void> {
    const quantidade = lerQuantidade(this.quantidadeEntrada());
    if (!quantidade || quantidade <= 0) {
      this.avisos.erro(new Error('Digite quanto chegou, por exemplo 50.'));
      return;
    }
    try {
      const atualizado = await firstValueFrom(this.api.entradaInsumo(insumo.id, quantidade));
      this.avisos.sucesso(`${insumo.nome}: agora são ${quantidadeBr(atualizado.estoque)} ${insumo.unidade}.`);
      this.entrando.set(null);
      this.carregar();
    } catch (e) {
      this.avisos.erro(e);
    }
  }

  protected async excluir(insumo: Insumo): Promise<void> {
    try {
      await firstValueFrom(this.api.excluirInsumo(insumo.id));
      this.avisos.sucesso(`${insumo.nome} foi excluído.`);
    } catch (e) {
      this.avisos.erro(e);
    } finally {
      this.excluindo.set(null);
      this.carregar();
    }
  }

  private async carregar(): Promise<void> {
    try {
      this.insumos.set(await firstValueFrom(this.api.insumos()));
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível carregar os insumos.');
    }
  }
}
