import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Avisos } from '../core/avisos';
import { Configuracoes as Config, Totem } from '../core/modelos';
import { FalhaFormulario, PainelApi, TotemForm } from '../core/painel-api';
import { Sessao } from '../core/sessao';

const STATUS_TOTEM: { valor: TotemForm['status']; nome: string }[] = [
  { valor: 'online', nome: 'Funcionando' },
  { valor: 'manutencao', nome: 'Em manutenção' },
  { valor: 'offline', nome: 'Desligado' },
];

@Component({
  selector: 'gt-configuracoes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabecalho-pagina">
      <div>
        <h1>Configurações</h1>
        <p>Como a loja aparece no totem e quais aparelhos estão em uso.</p>
      </div>
    </header>

    <div class="grade">
      <section class="bloco" aria-labelledby="titulo-loja">
        <h2 id="titulo-loja">Loja</h2>

        @if (config(); as c) {
          <form class="form-loja" (submit)="$event.preventDefault(); salvar()" novalidate>
            <div class="logo">
              <div class="logo-previa">
                @if (c.logo_url) {
                  <img [src]="c.logo_url" alt="Logo atual" />
                } @else {
                  <span class="texto-suave">Sem logo</span>
                }
              </div>
              <div class="logo-texto">
                <strong>Logo</strong>
                <span class="texto-suave">Aparece na tela inicial do totem. Use JPG, PNG ou WebP com fundo branco.</span>
                @if (pode) {
                  <label class="btn btn-pequeno btn-contorno" for="arquivo-logo">{{ enviandoLogo() ? 'Enviando' : 'Trocar logo' }}</label>
                  <input id="arquivo-logo" class="visualmente-oculto" type="file" accept="image/jpeg,image/png,image/webp" [disabled]="enviandoLogo()" (change)="trocarLogo($event)" />
                }
              </div>
            </div>

            <div class="grade-campos">
              <div class="campo largo">
                <label for="cfg-nome">Nome da loja</label>
                <input id="cfg-nome" maxlength="60" [disabled]="!pode" [class.invalido]="erros()['nome_loja']" [value]="nome()" (input)="nome.set(valor($event))" />
                @if (erros()['nome_loja']) {
                  <span class="erro-campo">{{ erros()['nome_loja'] }}</span>
                }
              </div>
              <div class="campo largo">
                <label for="cfg-frase">Frase da tela inicial</label>
                <input id="cfg-frase" maxlength="120" [disabled]="!pode" [value]="frase()" (input)="frase.set(valor($event))" />
              </div>
              <div class="campo">
                <label for="cfg-espera">Tempo de espera (min)</label>
                <input id="cfg-espera" type="number" min="1" max="180" [disabled]="!pode" [class.invalido]="erros()['tempo_espera_min']" [value]="espera()" (input)="espera.set(valor($event))" />
                @if (erros()['tempo_espera_min']) {
                  <span class="erro-campo">{{ erros()['tempo_espera_min'] }}</span>
                } @else {
                  <span class="ajuda">Previsão padrão mostrada ao cliente.</span>
                }
              </div>
              <div class="campo">
                <label for="cfg-estoque">Avisar estoque baixo com</label>
                <input id="cfg-estoque" type="number" min="0" max="999" [disabled]="!pode" [class.invalido]="erros()['estoque_baixo']" [value]="estoque()" (input)="estoque.set(valor($event))" />
                @if (erros()['estoque_baixo']) {
                  <span class="erro-campo">{{ erros()['estoque_baixo'] }}</span>
                } @else {
                  <span class="ajuda">unidades ou menos.</span>
                }
              </div>
            </div>

            <fieldset class="fidelidade-cfg">
              <legend>Cartão fidelidade</legend>
              <label class="interruptor">
                <input type="checkbox" [disabled]="!pode" [checked]="fidelidadeAtiva()" (change)="fidelidadeAtiva.set(!fidelidadeAtiva())" />
                Oferecer no totem
              </label>
              <div class="grade-campos">
                <div class="campo">
                  <label for="cfg-meta">Pedidos pra ganhar</label>
                  <input id="cfg-meta" type="number" min="2" max="50" [disabled]="!pode || !fidelidadeAtiva()" [class.invalido]="erros()['fidelidade_meta']" [value]="fidelidadeMeta()" (input)="fidelidadeMeta.set(valor($event))" />
                  @if (erros()['fidelidade_meta']) {
                    <span class="erro-campo">{{ erros()['fidelidade_meta'] }}</span>
                  } @else {
                    <span class="ajuda">Cada pedido com o celular vale um selo.</span>
                  }
                </div>
                <div class="campo">
                  <label for="cfg-premio">Desconto do prêmio (R$)</label>
                  <input id="cfg-premio" inputmode="decimal" [disabled]="!pode || !fidelidadeAtiva()" [class.invalido]="erros()['fidelidade_premio']" [value]="fidelidadePremio()" (input)="fidelidadePremio.set(valor($event))" />
                  @if (erros()['fidelidade_premio']) {
                    <span class="erro-campo">{{ erros()['fidelidade_premio'] }}</span>
                  } @else {
                    <span class="ajuda">Descontado no pedido em que o cliente troca os selos.</span>
                  }
                </div>
              </div>
            </fieldset>

            @if (pode) {
              <div class="rodape-form">
                <button class="btn btn-tinta" type="submit" [disabled]="salvando()">{{ salvando() ? 'Salvando' : 'Salvar configurações' }}</button>
              </div>
            }
          </form>
        } @else {
          <div class="vazio-painel">Carregando</div>
        }
      </section>

      <section class="bloco" aria-labelledby="titulo-totens">
        <div class="bloco-topo">
          <h2 id="titulo-totens">Totens</h2>
          @if (pode && editandoTotem() === undefined) {
            <button class="btn btn-pequeno btn-tinta" type="button" (click)="editarTotem(null)">Adicionar totem</button>
          }
        </div>

        @if (editandoTotem() !== undefined) {
          <form class="form-totem" (submit)="$event.preventDefault(); salvarTotem()" novalidate>
            <h3>{{ editandoTotem() ? 'Editar ' + editandoTotem()!.codigo : 'Novo totem' }}</h3>
            <div class="grade-campos">
              <div class="campo">
                <label for="t-codigo">Código</label>
                <input id="t-codigo" placeholder="TOTEM-04" maxlength="30" [class.invalido]="errosTotem()['codigo']" [value]="totemCodigo()" (input)="totemCodigo.set(valor($event))" />
                @if (errosTotem()['codigo']) {
                  <span class="erro-campo">{{ errosTotem()['codigo'] }}</span>
                } @else {
                  <span class="ajuda">O mesmo do config.ts do aparelho.</span>
                }
              </div>
              <div class="campo">
                <label for="t-local">Onde fica</label>
                <input id="t-local" placeholder="Ex.: Entrada principal" maxlength="120" [class.invalido]="errosTotem()['localizacao']" [value]="totemLocal()" (input)="totemLocal.set(valor($event))" />
                @if (errosTotem()['localizacao']) {
                  <span class="erro-campo">{{ errosTotem()['localizacao'] }}</span>
                }
              </div>
              <div class="campo">
                <label for="t-status">Situação</label>
                <select id="t-status" (change)="totemStatus.set($any(valor($event)))">
                  @for (s of statusTotem; track s.valor) {
                    <option [value]="s.valor" [selected]="totemStatus() === s.valor">{{ s.nome }}</option>
                  }
                </select>
              </div>
            </div>
            <div class="rodape-form">
              <button class="btn btn-contorno" type="button" (click)="editandoTotem.set(undefined)">Cancelar</button>
              <button class="btn btn-tinta" type="submit" [disabled]="salvando()">{{ editandoTotem() ? 'Salvar totem' : 'Adicionar totem' }}</button>
            </div>
          </form>
        }

        <ul class="totens">
          @for (t of totens(); track t.id) {
            <li>
              <div>
                <strong>{{ t.codigo }}</strong>
                <span class="texto-suave">{{ t.localizacao }}</span>
              </div>
              <span [class]="seloTotem(t.status.valor)">{{ nomeStatus(t.status.valor) }}</span>
              <span class="hoje texto-suave">{{ t.pedidos_hoje ?? 0 }} {{ t.pedidos_hoje === 1 ? 'pedido' : 'pedidos' }} hoje</span>
              @if (pode) {
                <span class="acoes-totem">
                  @if (excluindo() === t.id) {
                    <span class="confirmar-inline">
                      <span>Remover?</span>
                      <button class="btn btn-pequeno btn-alerta" type="button" (click)="excluirTotem(t)">Remover</button>
                      <button class="btn btn-pequeno btn-contorno" type="button" (click)="excluindo.set(null)">Voltar</button>
                    </span>
                  } @else {
                    <button class="btn btn-pequeno btn-contorno" type="button" (click)="editarTotem(t)">Editar</button>
                    <button class="btn btn-pequeno btn-discreto" type="button" (click)="excluindo.set(t.id)">Remover</button>
                  }
                </span>
              }
            </li>
          } @empty {
            <li class="texto-suave">Nenhum totem cadastrado.</li>
          }
        </ul>
        <p class="nota texto-suave">Remover um totem não apaga os pedidos feitos nele.</p>
      </section>
    </div>
  `,
  styles: `
    .grade { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--espaco-4); align-items: start; }
    .form-loja { display: grid; gap: var(--espaco-5); }
    .fidelidade-cfg { display: grid; gap: var(--espaco-3); margin: 0; padding: var(--espaco-4) 0 0; border: 0; border-top: 1px solid var(--linha); }
    .fidelidade-cfg legend { float: left; width: 100%; margin-bottom: var(--espaco-1); font-weight: 750; }
    .logo { display: flex; gap: var(--espaco-4); align-items: center; }
    .logo-previa {
      display: grid; place-items: center; flex: none; width: 6rem; height: 6rem;
      border: 1px solid var(--linha); border-radius: var(--raio-medio); background: var(--papel); overflow: hidden;
    }
    .logo-previa img { width: 85%; height: 85%; object-fit: contain; }
    .logo-texto { display: grid; justify-items: start; gap: 0.3rem; }
    .logo-texto .texto-suave { font-size: 0.82rem; max-width: 30ch; }
    .logo-texto label { cursor: pointer; margin-top: 0.2rem; }
    .logo-texto:has(input:focus-visible) label { outline: 3px solid var(--brasa); outline-offset: 2px; }
    .rodape-form { display: flex; justify-content: flex-end; gap: var(--espaco-2); }
    .form-totem { display: grid; gap: var(--espaco-4); margin-bottom: var(--espaco-4); padding: var(--espaco-4); border: 1px solid var(--linha); border-radius: var(--raio-medio); background: #faf9f7; }
    .form-totem h3 { font-size: 0.95rem; }
    .totens { display: grid; margin: 0; padding: 0; list-style: none; }
    .totens li {
      display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--espaco-2) var(--espaco-4);
      padding: 0.75rem 0; border-bottom: 1px solid var(--linha);
    }
    .totens li > div { display: grid; }
    .totens strong { white-space: nowrap; }
    .totens li > div .texto-suave { font-size: 0.82rem; }
    .acoes-totem { display: flex; justify-content: flex-end; gap: var(--espaco-1); }
    .hoje { font-size: 0.82rem; font-variant-numeric: tabular-nums; }
    .nota { margin-top: var(--espaco-3); font-size: 0.8rem; }
    @media (max-width: 1000px) { .grade { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export class Configuracoes {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);
  protected readonly pode = inject(Sessao).pode('configuracoes');

  protected readonly statusTotem = STATUS_TOTEM;
  protected readonly config = signal<Config | null>(null);
  protected readonly nome = signal('');
  protected readonly frase = signal('');
  protected readonly espera = signal('');
  protected readonly estoque = signal('');
  protected readonly fidelidadeAtiva = signal(true);
  protected readonly fidelidadeMeta = signal('');
  protected readonly fidelidadePremio = signal('');
  protected readonly erros = signal<Record<string, string>>({});
  protected readonly salvando = signal(false);
  protected readonly enviandoLogo = signal(false);

  protected readonly totens = signal<Totem[]>([]);
  protected readonly editandoTotem = signal<Totem | null | undefined>(undefined);
  protected readonly totemCodigo = signal('');
  protected readonly totemLocal = signal('');
  protected readonly totemStatus = signal<TotemForm['status']>('online');
  protected readonly errosTotem = signal<Record<string, string>>({});
  protected readonly excluindo = signal<number | null>(null);

  constructor() {
    this.carregar();
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected nomeStatus(status: string): string {
    return STATUS_TOTEM.find((s) => s.valor === status)?.nome ?? status;
  }

  protected seloTotem(status: string): string {
    return status === 'online' ? 'selo selo-ok' : status === 'manutencao' ? 'selo selo-brasa' : 'selo selo-neutro';
  }

  protected async salvar(): Promise<void> {
    this.salvando.set(true);
    this.erros.set({});
    try {
      const salvo = await firstValueFrom(
        this.api.salvarConfiguracoes({
          nome_loja: this.nome().trim(),
          frase_totem: this.frase().trim() || null,
          tempo_espera_min: Math.round(Number(this.espera())),
          estoque_baixo: Math.round(Number(this.estoque())),
          fidelidade_ativa: this.fidelidadeAtiva(),
          fidelidade_meta: Math.round(Number(this.fidelidadeMeta())),
          fidelidade_premio: Number(this.fidelidadePremio().replace(/\s|R\$/g, '').replace(',', '.')),
        }),
      );
      this.preencher(salvo);
      this.avisos.sucesso('Configurações salvas. O totem usa os novos dados no próximo cliente.');
    } catch (e) {
      if (e instanceof FalhaFormulario) this.erros.set(e.campos);
      this.avisos.erro(e);
    } finally {
      this.salvando.set(false);
    }
  }

  protected async trocarLogo(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const arquivo = campo.files?.[0];
    campo.value = '';
    if (!arquivo) return;

    this.enviandoLogo.set(true);
    try {
      this.config.set(await firstValueFrom(this.api.enviarLogo(arquivo)));
      this.avisos.sucesso('Logo atualizada.');
    } catch (e) {
      this.avisos.erro(e);
    } finally {
      this.enviandoLogo.set(false);
    }
  }

  protected editarTotem(totem: Totem | null): void {
    this.editandoTotem.set(totem);
    this.totemCodigo.set(totem?.codigo ?? '');
    this.totemLocal.set(totem?.localizacao ?? '');
    this.totemStatus.set(totem?.status.valor ?? 'online');
    this.errosTotem.set({});
  }

  protected async salvarTotem(): Promise<void> {
    this.salvando.set(true);
    this.errosTotem.set({});
    try {
      await firstValueFrom(
        this.api.salvarTotem(
          { codigo: this.totemCodigo().trim().toUpperCase(), localizacao: this.totemLocal().trim(), status: this.totemStatus() },
          this.editandoTotem()?.id,
        ),
      );
      this.avisos.sucesso(this.editandoTotem() ? 'Totem atualizado.' : 'Totem adicionado.');
      this.editandoTotem.set(undefined);
      this.totens.set(await firstValueFrom(this.api.totens()));
    } catch (e) {
      if (e instanceof FalhaFormulario && Object.keys(e.campos).length) this.errosTotem.set(e.campos);
      else this.avisos.erro(e);
    } finally {
      this.salvando.set(false);
    }
  }

  protected async excluirTotem(totem: Totem): Promise<void> {
    try {
      await firstValueFrom(this.api.excluirTotem(totem.id));
      this.excluindo.set(null);
      this.avisos.sucesso(`${totem.codigo} removido.`);
      this.totens.set(await firstValueFrom(this.api.totens()));
    } catch (e) {
      this.avisos.erro(e);
    }
  }

  private preencher(c: Config): void {
    this.config.set(c);
    this.nome.set(c.nome_loja);
    this.frase.set(c.frase_totem ?? '');
    this.espera.set(String(c.tempo_espera_min));
    this.estoque.set(String(c.estoque_baixo));
    this.fidelidadeAtiva.set(c.fidelidade.ativa);
    this.fidelidadeMeta.set(String(c.fidelidade.meta));
    this.fidelidadePremio.set(c.fidelidade.premio.toFixed(2).replace('.', ','));
  }

  private async carregar(): Promise<void> {
    try {
      const [config, totens] = await Promise.all([firstValueFrom(this.api.configuracoes()), firstValueFrom(this.api.totens())]);
      this.preencher(config);
      this.totens.set(totens);
    } catch (e) {
      this.avisos.erro(e, 'Não foi possível carregar as configurações.');
    }
  }
}
