import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { Usuario } from '../core/modelos';
import { FalhaFormulario, PainelApi } from '../core/painel-api';
import { Sessao } from '../core/sessao';

// o que cada papel pode fazer, em linguagem da loja (igual a App\Enums\Papel na API)
const PAPEIS = [
  { valor: 'administrador', nome: 'Administrador', pode: 'Tudo, inclusive equipe e configurações.' },
  { valor: 'cardapio', nome: 'Cardápio', pode: 'Cadastra produtos, preços, fotos e categorias.' },
  { valor: 'atendimento', nome: 'Atendimento', pode: 'Mexe na fila da cozinha e no caixa.' },
  { valor: 'leitura', nome: 'Somente leitura', pode: 'Vê tudo, não altera nada.' },
];

@Component({
  selector: 'gt-usuario-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #janela class="janela" aria-labelledby="titulo-usuario" (cancel)="$event.preventDefault(); fechar.emit()" (click)="cliqueNoFundo($event)">
      <header class="janela-topo">
        <h2 id="titulo-usuario">{{ usuario() ? 'Editar ' + usuario()!.nome : 'Nova pessoa na equipe' }}</h2>
        <button class="btn btn-icone btn-contorno" type="button" aria-label="Fechar" (click)="fechar.emit()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      <form class="janela-corpo" id="form-usuario" (submit)="$event.preventDefault(); salvar()" novalidate>
        <div class="grade-campos">
          <div class="campo">
            <label for="u-nome">Nome</label>
            <input id="u-nome" autocomplete="off" maxlength="120" [class.invalido]="erros()['nome']" [value]="nome()" (input)="nome.set(valor($event))" />
            @if (erros()['nome']) {
              <span class="erro-campo">{{ erros()['nome'] }}</span>
            }
          </div>
          <div class="campo">
            <label for="u-email">E-mail de acesso</label>
            <input id="u-email" type="email" autocomplete="off" [class.invalido]="erros()['email']" [value]="email()" (input)="email.set(valor($event))" />
            @if (erros()['email']) {
              <span class="erro-campo">{{ erros()['email'] }}</span>
            }
          </div>
          <div class="campo largo">
            <label for="u-senha">{{ usuario() ? 'Nova senha' : 'Senha' }}</label>
            <input id="u-senha" type="password" autocomplete="new-password" [class.invalido]="erros()['senha']" [value]="senha()" (input)="senha.set(valor($event))" />
            @if (erros()['senha']) {
              <span class="erro-campo">{{ erros()['senha'] }}</span>
            } @else {
              <span class="ajuda">{{ usuario() ? 'Deixe em branco para manter a senha atual.' : 'Pelo menos 6 caracteres.' }}</span>
            }
          </div>
        </div>

        <fieldset class="papeis">
          <legend>O que essa pessoa pode fazer</legend>
          @for (p of papeis; track p.valor) {
            <label class="papel" [class.marcado]="papel() === p.valor">
              <input type="radio" name="papel" [value]="p.valor" [checked]="papel() === p.valor" (change)="papel.set(p.valor)" />
              <span>
                <strong>{{ p.nome }}</strong>
                <span class="texto-suave">{{ p.pode }}</span>
              </span>
            </label>
          }
          @if (erros()['papel']) {
            <span class="erro-campo">{{ erros()['papel'] }}</span>
          }
        </fieldset>

        <label class="interruptor"><input type="checkbox" [checked]="ativo()" (change)="ativo.set(!ativo())" /> Acesso liberado</label>
      </form>

      <footer class="janela-rodape">
        @if (erroGeral(); as mensagem) {
          <span class="erro-geral" role="alert">{{ mensagem }}</span>
        }
        <button class="btn btn-contorno" type="button" (click)="fechar.emit()">Cancelar</button>
        <button class="btn btn-tinta" type="submit" form="form-usuario" [disabled]="salvando()">
          {{ salvando() ? 'Salvando' : usuario() ? 'Salvar alterações' : 'Adicionar à equipe' }}
        </button>
      </footer>
    </dialog>
  `,
  styles: `
    .janela { width: min(100% - 2rem, 38rem); }
    .papeis { display: grid; gap: var(--espaco-2); margin: 0; padding: 0; border: 0; }
    .papeis legend { margin-bottom: var(--espaco-2); font-weight: 650; font-size: 0.85rem; }
    .papel {
      display: flex; align-items: flex-start; gap: var(--espaco-3); padding: 0.7rem 0.9rem;
      border: 1px solid var(--linha); border-radius: 10px; cursor: pointer;
    }
    .papel > span { display: grid; }
    .papel .texto-suave { font-size: 0.82rem; }
    .papel input { margin-top: 0.25rem; accent-color: var(--tinta); }
    .papel.marcado { border-color: transparent; box-shadow: var(--traco-triplo); }
  `,
})
export class UsuarioFormJanela implements OnInit {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);

  readonly usuario = input<Usuario | null>(null);
  readonly fechar = output<void>();
  readonly salvo = output<void>();

  private janela = viewChild.required<ElementRef<HTMLDialogElement>>('janela');

  protected readonly papeis = PAPEIS;
  protected readonly nome = signal('');
  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly papel = signal('atendimento');
  protected readonly ativo = signal(true);
  protected readonly erros = signal<Record<string, string>>({});
  protected readonly erroGeral = signal<string | null>(null);
  protected readonly salvando = signal(false);

  constructor() {
    afterNextRender(() => this.janela().nativeElement.showModal());
  }

  ngOnInit(): void {
    const u = this.usuario();
    if (!u) return;
    this.nome.set(u.nome);
    this.email.set(u.email);
    this.papel.set(u.papel.valor);
    this.ativo.set(u.ativo);
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
        this.api.salvarUsuario(
          { nome: this.nome().trim(), email: this.email().trim(), senha: this.senha(), papel: this.papel(), ativo: this.ativo() },
          this.usuario()?.id,
        ),
      );
      this.avisos.sucesso(this.usuario() ? 'Dados atualizados.' : `${this.nome().trim()} foi adicionado à equipe.`);
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
  selector: 'gt-equipe',
  imports: [UsuarioFormJanela],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecalho-pagina">
      <div>
        <h1>Equipe</h1>
        <p>Quem entra no painel e na cozinha, e o que cada pessoa pode alterar.</p>
      </div>
      <div class="acoes">
        <button class="btn btn-tinta" type="button" (click)="editando.set(null)">Adicionar pessoa</button>
      </div>
    </header>

    <section class="bloco tabela-bloco">
      @if (usuarios(); as lista) {
        <div class="rolagem-tabela">
          <table class="tabela">
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Permissão</th>
                <th>Acesso</th>
                <th><span class="visualmente-oculto">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (u of lista; track u.id) {
                <tr>
                  <td>
                    <div class="pessoa">
                      <span class="inicial" aria-hidden="true">{{ u.nome.charAt(0) }}</span>
                      <div>
                        <strong>{{ u.nome }}</strong>
                        @if (u.id === meuId()) {
                          <span class="voce">você</span>
                        }
                        <span class="texto-suave">{{ u.email }}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong class="papel">{{ u.papel.rotulo }}</strong>
                    <span class="texto-suave descricao">{{ descricaoPapel(u.papel.valor) }}</span>
                  </td>
                  <td><span [class]="u.ativo ? 'selo selo-ok' : 'selo selo-neutro'">{{ u.ativo ? 'Liberado' : 'Bloqueado' }}</span></td>
                  <td class="acoes-linha">
                    @if (excluindo() === u.id) {
                      <span class="confirmar-inline">
                        <span>Remover {{ u.nome }}?</span>
                        <button class="btn btn-pequeno btn-alerta" type="button" (click)="excluir(u)">Remover</button>
                        <button class="btn btn-pequeno btn-contorno" type="button" (click)="excluindo.set(null)">Voltar</button>
                      </span>
                    } @else {
                      <button class="btn btn-pequeno btn-contorno" type="button" (click)="editando.set(u)">Editar</button>
                      @if (u.id !== meuId()) {
                        <button class="btn btn-pequeno btn-discreto" type="button" (click)="excluindo.set(u.id)">Remover</button>
                      }
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="vazio-painel">Carregando a equipe</div>
      }
    </section>

    @if (editando() !== undefined) {
      <gt-usuario-form [usuario]="editando() ?? null" (fechar)="editando.set(undefined)" (salvo)="salvou()" />
    }
  `,
  styles: `
    .tabela-bloco { padding: var(--espaco-2) var(--espaco-4); }
    .pessoa { display: flex; align-items: center; gap: var(--espaco-3); min-width: 14rem; }
    .pessoa div { display: grid; }
    .inicial {
      display: grid; place-items: center; flex: none; width: 2.25rem; height: 2.25rem;
      border-radius: 50%; background: var(--fumaca); font-weight: 800;
    }
    .voce { justify-self: start; margin: 0.1rem 0; padding: 0 0.45rem; border-radius: 999px; background: var(--brasa); font-size: 0.72rem; font-weight: 700; }
    .papel { display: block; }
    .descricao { font-size: 0.8rem; }
  `,
})
export class Equipe {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);
  private sessao = inject(Sessao);

  protected readonly usuarios = signal<Usuario[] | null>(null);
  protected readonly editando = signal<Usuario | null | undefined>(undefined);
  protected readonly excluindo = signal<number | null>(null);
  protected readonly meuId = computed(() => this.sessao.usuario()?.id ?? null);

  constructor() {
    this.carregar();
  }

  protected descricaoPapel(papel: string): string {
    return PAPEIS.find((p) => p.valor === papel)?.pode ?? '';
  }

  protected salvou(): void {
    this.editando.set(undefined);
    this.carregar();
  }

  protected async excluir(usuario: Usuario): Promise<void> {
    try {
      await firstValueFrom(this.api.excluirUsuario(usuario.id));
      this.excluindo.set(null);
      this.avisos.sucesso(`${usuario.nome} foi removido da equipe.`);
      this.carregar();
    } catch (e) {
      this.excluindo.set(null);
      this.avisos.erro(e);
    }
  }

  private async carregar(): Promise<void> {
    try {
      this.usuarios.set(await firstValueFrom(this.api.usuarios()));
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível carregar a equipe.');
    }
  }
}
