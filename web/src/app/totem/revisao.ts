import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Carrinho } from '../core/carrinho';
import { Loja } from '../core/loja';
import { TotemApi } from '../core/totem-api';
import { CabecalhoEtapa } from '../shared/cabecalho-etapa';
import { DinheiroPipe } from '../shared/dinheiro.pipe';

@Component({
  selector: 'gt-revisao',
  imports: [CabecalhoEtapa, DinheiroPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tela">
      <gt-cabecalho-etapa titulo="Seu pedido" />

      @if (carrinho.vazio()) {
        <section class="vazio">
          <p>Seu pedido ainda não tem itens.</p>
          <a class="btn btn-tinta" routerLink="/totem/cardapio">Ver o cardápio</a>
        </section>
      } @else {
        <div class="consumo" role="radiogroup" aria-label="Onde você vai comer?">
          <button type="button" role="radio" [attr.aria-checked]="carrinho.consumo() === 'local'" (click)="carrinho.consumo.set('local')">
            Comer aqui
          </button>
          <button type="button" role="radio" [attr.aria-checked]="carrinho.consumo() === 'viagem'" (click)="carrinho.consumo.set('viagem')">
            Para levar
          </button>
        </div>

        <ul class="linhas">
          @for (linha of carrinho.linhas(); track linha.chave) {
            <li class="linha">
              @if (linha.produto.imagem_url) {
                <img [src]="linha.produto.imagem_url" alt="" width="112" height="112" />
              }
              <div class="detalhes">
                <h2>{{ linha.produto.nome }}</h2>
                @for (escolha of escolhasDe(linha.personalizacoes); track escolha) {
                  <p class="texto-suave">{{ escolha }}</p>
                }
                @if (linha.observacao) {
                  <p class="observacao">“{{ linha.observacao }}”</p>
                }
                <button class="remover" type="button" (click)="carrinho.remover(linha.chave)">Remover</button>
              </div>
              <div class="lado">
                <span class="preco">{{ linha.produto.preco * linha.quantidade | dinheiro }}</span>
                <div class="quantidade" role="group" [attr.aria-label]="'Quantidade de ' + linha.produto.nome">
                  <button type="button" [attr.aria-label]="linha.quantidade === 1 ? 'Remover' : 'Diminuir'" (click)="carrinho.alterarQuantidade(linha.chave, -1)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /></svg>
                  </button>
                  <output>{{ linha.quantidade }}</output>
                  <button
                    type="button"
                    aria-label="Aumentar"
                    [disabled]="carrinho.quantidadeDo(linha.produto.id) >= linha.produto.estoque"
                    (click)="carrinho.alterarQuantidade(linha.chave, 1)"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                </div>
              </div>
            </li>
          }
        </ul>

        <section class="cupom" aria-label="Cupom de desconto">
          @if (carrinho.cupom(); as c) {
            <div class="cupom-aplicado">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v8a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2zM9 9.5h.01M15 14.5h.01M15 9l-6 6" /></svg>
              <div>
                <strong>Cupom {{ c.codigo }}</strong>
                @if (carrinho.cupomAbaixoDoMinimo()) {
                  <span class="cupom-aviso">Vale para pedidos a partir de {{ c.pedido_minimo | dinheiro }}</span>
                } @else {
                  <span>{{ c.descricao || 'Desconto aplicado' }}: −{{ carrinho.desconto() | dinheiro }}</span>
                }
              </div>
              <button type="button" class="remover" (click)="carrinho.cupom.set(null)">Remover</button>
            </div>
          } @else if (digitandoCupom()) {
            <form class="cupom-form" (submit)="$event.preventDefault(); aplicarCupom()">
              <label class="visualmente-oculto" for="cupom">Código do cupom</label>
              <input
                id="cupom"
                type="text"
                maxlength="30"
                autocomplete="off"
                autocapitalize="characters"
                spellcheck="false"
                placeholder="Código do cupom"
                [value]="codigoCupom()"
                (input)="codigoCupom.set($any($event.target).value.toUpperCase()); erroCupom.set(null)"
              />
              <button class="btn btn-tinta" type="submit" [disabled]="!codigoCupom().trim() || conferindo()">
                {{ conferindo() ? 'Conferindo' : 'Aplicar' }}
              </button>
            </form>
            @if (erroCupom(); as erro) {
              <p class="cupom-erro" role="alert">{{ erro }}</p>
            }
          } @else {
            <button type="button" class="abrir-cupom" (click)="digitandoCupom.set(true)">Tem um cupom de desconto?</button>
          }
        </section>

        @if (regrasFidelidade(); as regras) {
          <section class="cupom" aria-label="Cartão fidelidade">
            @if (carrinho.fidelidade(); as f) {
              <div class="cupom-aplicado">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4l-5.2 2.8 1-5.9L3.5 9.2l5.9-.8z" /></svg>
                <div>
                  <strong>Cartão fidelidade · {{ telefoneVisivel() }}</strong>
                  @if (f.pode_resgatar) {
                    <span>Você juntou {{ f.meta }} selos e ganhou {{ f.premio | dinheiro }} de desconto!</span>
                  } @else {
                    <span>{{ f.selos }} de {{ f.meta }} selos. Este pedido vale mais um.</span>
                  }
                  <span class="selos" aria-hidden="true">
                    @for (n of selosDe(f.meta); track n) {
                      <i [class.cheio]="n <= f.selos"></i>
                    }
                  </span>
                </div>
                <div class="fidelidade-acoes">
                  @if (f.pode_resgatar) {
                    <button type="button" class="btn btn-pequeno" [class.btn-brasa]="!carrinho.resgatarPremio()" [class.btn-tinta]="carrinho.resgatarPremio()" (click)="alternarPremio()">
                      {{ carrinho.resgatarPremio() ? 'Usando o prêmio' : 'Usar agora' }}
                    </button>
                  }
                  <button type="button" class="remover" (click)="sairFidelidade()">Remover</button>
                </div>
              </div>
            } @else if (digitandoTelefone()) {
              <form class="cupom-form" (submit)="$event.preventDefault(); consultarFidelidade()">
                <label class="visualmente-oculto" for="telefone">Celular com DDD</label>
                <input
                  id="telefone"
                  type="tel"
                  inputmode="numeric"
                  maxlength="15"
                  autocomplete="off"
                  placeholder="(11) 98765-4321"
                  [value]="carrinho.telefone()"
                  (input)="digitarTelefone($event)"
                />
                <button class="btn btn-tinta" type="submit" [disabled]="!telefoneCompleto() || conferindo()">
                  {{ conferindo() ? 'Conferindo' : 'Ver meus selos' }}
                </button>
              </form>
              @if (erroTelefone(); as erro) {
                <p class="cupom-erro" role="alert">{{ erro }}</p>
              } @else {
                <p class="ajuda-fidelidade">Usamos o celular só pra contar seus selos. Não mandamos mensagem.</p>
              }
            } @else {
              <button type="button" class="abrir-cupom" (click)="digitandoTelefone.set(true)">
                Cartão fidelidade: a cada {{ regras.meta }} pedidos, ganhe {{ regras.premio | dinheiro }}
              </button>
            }
          </section>
        }

        <footer class="fechamento">
          <div class="total">
            <span>
              Total
              @if (carrinho.desconto()) {
                <small>de <s>{{ carrinho.total() | dinheiro }}</s></small>
              }
            </span>
            <strong class="preco">{{ carrinho.aPagar() | dinheiro }}</strong>
          </div>
          <a class="btn btn-brasa btn-largo" routerLink="/totem/pagamento">Ir para o pagamento</a>
          <a class="btn btn-contorno btn-largo" routerLink="/totem/cardapio">Adicionar mais itens</a>
        </footer>
      }
    </div>
  `,
  styles: `
    .tela { display: flex; flex-direction: column; min-height: 100dvh; }
    .linhas, .fechamento, .vazio { width: min(100%, 60rem); margin-inline: auto; }

    .consumo {
      display: grid; grid-template-columns: 1fr 1fr; gap: var(--espaco-1);
      width: min(100% - 2 * var(--espaco-5), 60rem - 2 * var(--espaco-5)); margin: var(--espaco-4) auto 0; padding: var(--espaco-1);
      border-radius: 999px; background: var(--fumaca);
    }
    .consumo button {
      min-height: 3.25rem; border: 0; border-radius: 999px; background: none;
      font-size: 1.1rem; font-weight: 700; color: var(--grafite);
    }
    .consumo button[aria-checked='true'] { background: var(--tinta); color: var(--papel); }

    .cupom { width: min(100%, 60rem); margin: 0 auto var(--espaco-4); padding: 0 var(--espaco-5); }
    .abrir-cupom {
      padding: var(--espaco-3) 0; border: 0; background: none;
      font-size: 1.1rem; font-weight: 700; text-decoration: underline; text-underline-offset: 0.25em;
    }
    .cupom-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--espaco-3); }
    .cupom-form input {
      min-height: 3.5rem; padding: 0 var(--espaco-4);
      border: 2px solid var(--tinta); border-radius: var(--raio-medio);
      font-size: 1.2rem; font-weight: 700; letter-spacing: 0.06em;
    }
    .cupom-form input::placeholder { letter-spacing: 0; font-weight: 400; color: #8a8a8a; }
    .cupom-form .btn { min-height: 3.5rem; padding-inline: var(--espaco-6); }
    .cupom-erro { margin-top: var(--espaco-2); color: var(--alerta); font-weight: 600; }
    .cupom-aplicado {
      display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: var(--espaco-3); align-items: center;
      padding: var(--espaco-3) var(--espaco-4); border-radius: var(--raio-medio); background: var(--fumaca);
    }
    .cupom-aplicado svg { width: 2rem; height: 2rem; fill: none; stroke: var(--brasa-escura); stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .cupom-aplicado div { display: grid; }
    .cupom-aplicado .remover { margin: 0; }
    .cupom-aviso { color: var(--alerta); font-weight: 600; }
    .cupom + .cupom { margin-top: calc(-1 * var(--espaco-2)); }
    .fidelidade-acoes { display: flex; align-items: center; gap: var(--espaco-3); }
    .selos { display: flex; flex-wrap: wrap; gap: 4px; margin-top: var(--espaco-1); }
    .selos i { width: 0.8rem; height: 0.8rem; border-radius: 50%; border: 2px solid var(--brasa-escura); }
    .selos i.cheio { background: var(--brasa); border-color: var(--brasa); }
    .ajuda-fidelidade { margin-top: var(--espaco-2); color: var(--grafite); font-size: 0.9rem; }
    .total small { display: block; color: var(--grafite); font-size: 0.95rem; font-weight: 500; }

    .linhas { flex: 1; margin-block: 0; padding: var(--espaco-3) var(--espaco-5); list-style: none; }

    .linha {
      display: grid;
      grid-template-columns: 7rem minmax(0, 1fr) auto;
      gap: var(--espaco-4);
      align-items: start;
      padding: var(--espaco-5) 0;
      border-bottom: 2px solid var(--fumaca);
    }
    .linha img { width: 7rem; height: 7rem; object-fit: cover; border-radius: var(--raio-medio); }

    .detalhes { display: grid; gap: var(--espaco-1); }
    .detalhes h2 { font-size: 1.35rem; font-variation-settings: 'wdth' 100; margin-bottom: var(--espaco-1); }
    .observacao { font-style: italic; }
    .remover {
      justify-self: start; margin-top: var(--espaco-2); padding: var(--espaco-2) 0;
      border: 0; background: none; color: var(--grafite);
      text-decoration: underline; text-underline-offset: 0.2em; font-weight: 600;
    }

    .lado { display: grid; justify-items: end; gap: var(--espaco-3); }
    .lado .preco { font-size: 1.3rem; }

    .quantidade { display: flex; align-items: center; gap: var(--espaco-1); }
    .quantidade button {
      display: grid; place-items: center; width: 3.25rem; height: 3.25rem;
      border: 0; border-radius: 50%; background: var(--fumaca);
    }
    .quantidade button:disabled { opacity: 0.35; cursor: not-allowed; }
    .quantidade svg { width: 40%; fill: none; stroke: var(--tinta); stroke-width: 2.6; stroke-linecap: round; }
    output { min-width: 2ch; font-size: 1.3rem; font-weight: 800; text-align: center; }

    .fechamento {
      position: sticky; bottom: 0;
      display: grid; gap: var(--espaco-3);
      padding: var(--espaco-5) var(--espaco-5) calc(var(--espaco-5) + env(safe-area-inset-bottom));
      background: var(--papel); border-top: 2px solid var(--tinta);
    }
    .total { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: var(--espaco-2); }
    .total span { font-size: 1.3rem; font-weight: 650; }
    .total .preco { font-size: 2.25rem; }
    .fechamento .btn-brasa { min-height: 5rem; font-size: 1.35rem; }

    .vazio { flex: 1; display: grid; place-content: center; justify-items: center; gap: var(--espaco-5); padding: var(--espaco-6); font-size: 1.2rem; }

    @media (max-width: 700px) {
      .linhas { padding-inline: var(--espaco-4); }
      .linha { grid-template-columns: 4rem minmax(0, 1fr); }
      .linha img { width: 4rem; height: 4rem; }
      .lado { grid-column: 2; grid-auto-flow: column; justify-content: space-between; align-items: center; justify-items: start; }
      .fechamento { padding-inline: var(--espaco-4); }
    }
    /* notebook: total e os dois botões numa linha só */
    @media (orientation: landscape) and (min-width: 701px) and (max-height: 900px) {
      .fechamento { grid-template-columns: 1fr auto auto; align-items: center; gap: var(--espaco-4); padding-block: var(--espaco-3); }
      .total { flex-direction: column; align-items: start; margin: 0; }
      .total .preco { font-size: 1.8rem; }
      .fechamento .btn { width: auto; min-height: 3.5rem; padding-inline: var(--espaco-6); font-size: 1.1rem; }
      .fechamento .btn-contorno { order: 1; }
      .fechamento .btn-brasa { order: 2; }
    }
  `,
})
export class Revisao {
  protected readonly carrinho = inject(Carrinho);
  private api = inject(TotemApi);

  protected readonly digitandoCupom = signal(false);
  protected readonly codigoCupom = signal('');
  protected readonly erroCupom = signal<string | null>(null);
  protected readonly conferindo = signal(false);

  private loja = inject(Loja);
  protected readonly regrasFidelidade = computed(() => {
    const regras = this.loja.cardapio()?.loja.fidelidade;
    return regras?.ativa ? regras : null;
  });
  protected readonly digitandoTelefone = signal(false);
  protected readonly erroTelefone = signal<string | null>(null);
  protected readonly telefoneCompleto = computed(() => this.carrinho.telefone().replace(/\D/g, '').length >= 10);
  protected readonly telefoneVisivel = computed(() => {
    const n = this.carrinho.telefone().replace(/\D/g, '');
    return `(${n.slice(0, 2)}) •••••-${n.slice(-4)}`;
  });

  protected selosDe(meta: number): number[] {
    return Array.from({ length: Math.min(meta, 20) }, (_, i) => i + 1);
  }

  // vai formatando enquanto digita: (11) 98765-4321
  protected digitarTelefone(evento: Event): void {
    const n = (evento.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 11);
    let texto = n;
    if (n.length > 2) texto = `(${n.slice(0, 2)}) ${n.slice(2)}`;
    if (n.length > 6) texto = `(${n.slice(0, 2)}) ${n.slice(2, n.length - 4)}-${n.slice(-4)}`;
    (evento.target as HTMLInputElement).value = texto;
    this.carrinho.telefone.set(texto);
    this.erroTelefone.set(null);
  }

  protected async consultarFidelidade(): Promise<void> {
    if (this.conferindo()) return;
    this.conferindo.set(true);
    try {
      this.carrinho.fidelidade.set(await firstValueFrom(this.api.consultarFidelidade(this.carrinho.telefone())));
      this.digitandoTelefone.set(false);
    } catch (e) {
      this.erroTelefone.set(e instanceof Error ? e.message : 'Não foi possível consultar agora.');
    } finally {
      this.conferindo.set(false);
    }
  }

  // prêmio e cupom não somam: escolher um tira o outro
  protected alternarPremio(): void {
    const usar = !this.carrinho.resgatarPremio();
    this.carrinho.resgatarPremio.set(usar);
    if (usar) this.carrinho.cupom.set(null);
  }

  protected sairFidelidade(): void {
    this.carrinho.fidelidade.set(null);
    this.carrinho.resgatarPremio.set(false);
    this.carrinho.telefone.set('');
  }

  protected async aplicarCupom(): Promise<void> {
    const codigo = this.codigoCupom().trim();
    if (!codigo || this.conferindo()) return;

    this.conferindo.set(true);
    try {
      this.carrinho.cupom.set(await firstValueFrom(this.api.conferirCupom(codigo, this.carrinho.total())));
      this.carrinho.resgatarPremio.set(false);
      this.digitandoCupom.set(false);
      this.codigoCupom.set('');
    } catch (e) {
      this.erroCupom.set(e instanceof Error ? e.message : 'Não foi possível conferir o cupom.');
    } finally {
      this.conferindo.set(false);
    }
  }

  protected escolhasDe(personalizacoes: Record<string, string>): string[] {
    return Object.entries(personalizacoes).map(([grupo, opcao]) => `${grupo}: ${opcao}`);
  }
}
