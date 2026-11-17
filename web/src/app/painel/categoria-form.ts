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
import { CategoriaPainel } from '../core/modelos';
import { FalhaFormulario, PainelApi } from '../core/painel-api';
import { IconeCategoria } from '../shared/icone-categoria';

const ICONES = [
  { valor: 'combo', nome: 'Combo' },
  { valor: 'burger', nome: 'Lanche' },
  { valor: 'porcao', nome: 'Porção' },
  { valor: 'bebida', nome: 'Bebida' },
  { valor: 'sobremesa', nome: 'Sobremesa' },
  { valor: 'molho', nome: 'Molho' },
  { valor: 'outros', nome: 'Outros' },
];

@Component({
  selector: 'gt-categoria-form',
  imports: [IconeCategoria],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #janela class="janela" aria-labelledby="titulo-categoria" (cancel)="$event.preventDefault(); fechar.emit()" (click)="cliqueNoFundo($event)">
      <header class="janela-topo">
        <h2 id="titulo-categoria">{{ categoria() ? 'Editar categoria' : 'Nova categoria' }}</h2>
        <button class="btn btn-icone btn-contorno" type="button" aria-label="Fechar" (click)="fechar.emit()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </header>

      <form class="janela-corpo" id="form-categoria" (submit)="$event.preventDefault(); salvar()" novalidate>
        <div class="grade-campos">
          <div class="campo largo">
            <label for="c-nome">Nome</label>
            <input id="c-nome" maxlength="120" [class.invalido]="erros()['nome']" [value]="nome()" (input)="nome.set(valor($event))" />
            @if (erros()['nome']) {
              <span class="erro-campo">{{ erros()['nome'] }}</span>
            }
          </div>
          <div class="campo largo">
            <label for="c-descricao">Descrição no totem</label>
            <input id="c-descricao" maxlength="180" [value]="descricao()" (input)="descricao.set(valor($event))" />
          </div>
          <div class="campo">
            <label for="c-ordem">Posição no menu</label>
            <input id="c-ordem" type="number" min="0" [value]="ordem()" (input)="ordem.set(valor($event))" />
            <span class="ajuda">Números menores aparecem primeiro.</span>
          </div>
          <div class="campo">
            <span class="rotulo">No totem</span>
            <label class="interruptor"><input type="checkbox" [checked]="ativo()" (change)="ativo.set(!ativo())" /> Mostrar categoria</label>
          </div>
        </div>

        <fieldset class="icones">
          <legend class="rotulo">Ícone</legend>
          <div role="radiogroup" aria-label="Ícone da categoria">
            @for (i of icones; track i.valor) {
              <button type="button" role="radio" [attr.aria-checked]="icone() === i.valor" [class.marcado]="icone() === i.valor" (click)="icone.set(i.valor)">
                <gt-icone-categoria [nome]="i.valor" />
                <span>{{ i.nome }}</span>
              </button>
            }
          </div>
        </fieldset>
      </form>

      <footer class="janela-rodape">
        @if (erroGeral(); as mensagem) {
          <span class="erro-geral" role="alert">{{ mensagem }}</span>
        }
        <button class="btn btn-contorno" type="button" (click)="fechar.emit()">Cancelar</button>
        <button class="btn btn-tinta" type="submit" form="form-categoria" [disabled]="salvando()">
          {{ salvando() ? 'Salvando' : categoria() ? 'Salvar alterações' : 'Criar categoria' }}
        </button>
      </footer>
    </dialog>
  `,
  styles: `
    .janela { width: min(100% - 2rem, 34rem); }
    .icones { margin: 0; padding: 0; border: 0; }
    .icones legend { margin-bottom: var(--espaco-2); font-weight: 650; font-size: 0.85rem; }
    .icones div { display: grid; grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr)); gap: var(--espaco-2); }
    .icones button {
      display: grid; justify-items: center; gap: 0.3rem; padding: var(--espaco-3) var(--espaco-2);
      border: 1px solid var(--linha); border-radius: 10px; background: var(--papel); font-size: 0.8rem; font-weight: 600;
    }
    .icones button.marcado { border-color: transparent; box-shadow: var(--traco-triplo); }
  `,
})
export class CategoriaFormJanela implements OnInit {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);

  readonly categoria = input<CategoriaPainel | null>(null);
  readonly proximaOrdem = input(1);
  readonly fechar = output<void>();
  readonly salvo = output<CategoriaPainel>();

  private janela = viewChild.required<ElementRef<HTMLDialogElement>>('janela');

  protected readonly icones = ICONES;
  protected readonly nome = signal('');
  protected readonly descricao = signal('');
  protected readonly ordem = signal('1');
  protected readonly icone = signal('outros');
  protected readonly ativo = signal(true);
  protected readonly erros = signal<Record<string, string>>({});
  protected readonly erroGeral = signal<string | null>(null);
  protected readonly salvando = signal(false);

  constructor() {
    afterNextRender(() => this.janela().nativeElement.showModal());
  }

  ngOnInit(): void {
    const c = this.categoria();
    if (c) {
      this.nome.set(c.nome);
      this.descricao.set(c.descricao ?? '');
      this.ordem.set(String(c.ordem));
      this.icone.set(c.icone ?? 'outros');
      this.ativo.set(c.ativo);
    } else {
      this.ordem.set(String(this.proximaOrdem()));
    }
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected cliqueNoFundo(evento: MouseEvent): void {
    if (evento.target === this.janela().nativeElement) this.fechar.emit();
  }

  protected async salvar(): Promise<void> {
    if (!this.nome().trim()) {
      this.erros.set({ nome: 'Dê um nome à categoria.' });
      return;
    }

    this.salvando.set(true);
    this.erros.set({});
    this.erroGeral.set(null);

    try {
      const categoria = await firstValueFrom(
        this.api.salvarCategoria(
          {
            nome: this.nome().trim(),
            descricao: this.descricao().trim() || null,
            icone: this.icone(),
            ordem: Math.max(0, Math.round(Number(this.ordem()) || 0)),
            ativo: this.ativo(),
          },
          this.categoria()?.id,
        ),
      );
      this.avisos.sucesso(this.categoria() ? 'Categoria atualizada.' : 'Categoria criada.');
      this.salvo.emit(categoria);
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
