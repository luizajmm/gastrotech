import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Carrinho } from '../core/carrinho';
import { FormaPagamento } from '../core/modelos';
import { FalhaPedido, TotemApi } from '../core/totem-api';
import { CabecalhoEtapa } from '../shared/cabecalho-etapa';
import { DinheiroPipe } from '../shared/dinheiro.pipe';

interface OpcaoPagamento {
  valor: FormaPagamento;
  nome: string;
  descricao: string;
  icone: string;
}

const OPCOES: OpcaoPagamento[] = [
  { valor: 'pix', nome: 'Pix', descricao: 'Aponte a câmera do celular para o QR Code', icone: 'M12 2.5l9.5 9.5-9.5 9.5L2.5 12zM12 8l4 4-4 4-4-4z' },
  { valor: 'cartao', nome: 'Cartão', descricao: 'Crédito ou débito na maquininha ao lado', icone: 'M3 6h18v12H3zM3 10h18M6.5 14.5h4' },
  { valor: 'dinheiro', nome: 'Dinheiro', descricao: 'Pague no caixa antes de retirar', icone: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5zM6.5 12h.01M17.5 12h.01' },
];

@Component({
  selector: 'gt-pagamento',
  imports: [CabecalhoEtapa, DinheiroPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tela">
      <gt-cabecalho-etapa titulo="Pagamento" voltarPara="/totem/pedido" voltarTexto="Seu pedido" />

      <form class="corpo" (submit)="$event.preventDefault(); confirmar()">
        <label class="nome">
          <span class="rotulo">Como podemos te chamar?</span>
          <span class="ajuda">Seu nome aparece no painel de retirada junto com o código.</span>
          <input
            type="text"
            maxlength="60"
            autocomplete="off"
            placeholder="Seu nome (opcional)"
            [value]="carrinho.nomeCliente()"
            (input)="carrinho.nomeCliente.set($any($event.target).value)"
          />
        </label>

        <fieldset class="formas">
          <legend class="rotulo">Como você quer pagar?</legend>
          <div class="opcoes" role="radiogroup" aria-label="Forma de pagamento">
            @for (opcao of opcoes; track opcao.valor) {
              <button
                type="button"
                role="radio"
                class="forma"
                [class.marcada]="carrinho.formaPagamento() === opcao.valor"
                [attr.aria-checked]="carrinho.formaPagamento() === opcao.valor"
                (click)="carrinho.formaPagamento.set(opcao.valor)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="opcao.icone" /></svg>
                <span class="forma-nome">{{ opcao.nome }}</span>
                <span class="forma-descricao">{{ opcao.descricao }}</span>
              </button>
            }
          </div>
        </fieldset>

        @if (erro(); as mensagem) {
          <div class="erro" role="alert">
            <strong>Não deu para concluir o pedido</strong>
            <p>{{ mensagem }}</p>
          </div>
        }

        <footer class="fechamento">
          <div class="total">
            <span>{{ carrinho.quantidadeItens() }} {{ carrinho.quantidadeItens() === 1 ? 'item' : 'itens' }}</span>
            <strong class="preco">{{ carrinho.total() | dinheiro }}</strong>
          </div>
          <button class="btn btn-brasa btn-largo" type="submit" [disabled]="!carrinho.formaPagamento() || enviando()">
            @if (enviando()) {
              <span class="girando" aria-hidden="true"></span>
              {{ carrinho.formaPagamento() === 'dinheiro' ? 'Enviando pedido' : 'Processando pagamento' }}
            } @else if (!carrinho.formaPagamento()) {
              Escolha a forma de pagamento
            } @else {
              Confirmar pedido
            }
          </button>
        </footer>
      </form>
    </div>
  `,
  styles: `
    .tela { display: flex; flex-direction: column; min-height: 100dvh; }
    .corpo { flex: 1; display: flex; flex-direction: column; gap: var(--espaco-6); width: min(100%, 60rem); margin-inline: auto; padding: var(--espaco-6) var(--espaco-5) 0; }

    .rotulo { display: block; font-size: 1.45rem; font-weight: 800; font-variation-settings: 'wdth' 100; }
    .ajuda { display: block; margin: var(--espaco-1) 0 var(--espaco-3); color: var(--grafite); }

    input {
      width: 100%; min-height: 4.5rem; padding: 0 var(--espaco-5);
      border: 2px solid var(--tinta); border-radius: var(--raio-medio);
      font-size: 1.35rem; font-weight: 600;
    }
    input::placeholder { color: #8a8a8a; font-weight: 400; }

    .formas { margin: 0; padding: 0; border: 0; }
    .formas legend { padding: 0; margin-bottom: var(--espaco-4); }
    .opcoes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--espaco-4); }

    .forma {
      display: grid; align-content: start; gap: var(--espaco-2); justify-items: start;
      min-height: 9rem; padding: var(--espaco-5);
      border: 0; border-radius: var(--raio-grande);
      background: var(--fumaca); text-align: left;
    }
    .forma svg { width: 2.5rem; height: 2.5rem; margin-bottom: var(--espaco-3); fill: none; stroke: var(--tinta); stroke-width: 1.7; stroke-linejoin: round; stroke-linecap: round; }
    .forma-nome { font-size: 1.45rem; font-weight: 800; font-variation-settings: 'wdth' 100; }
    .forma-descricao { color: var(--grafite); font-size: 0.98rem; line-height: 1.3; }
    .forma.marcada { background: var(--papel); box-shadow: var(--traco-triplo); }
    .forma.marcada svg { stroke: var(--brasa-escura); }

    .erro {
      padding: var(--espaco-4) var(--espaco-5);
      border-left: 6px solid var(--alerta);
      background: #fdecec;
      border-radius: 0 var(--raio-medio) var(--raio-medio) 0;
    }
    .erro strong { display: block; margin-bottom: var(--espaco-1); }

    .fechamento {
      position: sticky; bottom: 0; margin-top: auto;
      display: grid; gap: var(--espaco-4);
      padding: var(--espaco-5) 0 calc(var(--espaco-5) + env(safe-area-inset-bottom));
      background: var(--papel); border-top: 2px solid var(--tinta);
    }
    .total { display: flex; align-items: baseline; justify-content: space-between; }
    .total span { font-size: 1.2rem; font-weight: 650; }
    .total .preco { font-size: 2.25rem; }
    .fechamento .btn { min-height: 5rem; font-size: 1.35rem; }
    .fechamento .btn:disabled { background: var(--fumaca-forte); opacity: 1; }

    .girando {
      width: 1.3rem; height: 1.3rem; border-radius: 50%;
      border: 3px solid currentColor; border-right-color: transparent;
      animation: gira 0.8s linear infinite;
    }
    @keyframes gira { to { transform: rotate(1turn); } }

    @media (max-width: 700px) {
      .corpo { padding-inline: var(--espaco-4); }
      .opcoes { grid-template-columns: minmax(0, 1fr); }
      .forma {
        min-height: 0; grid-template-columns: auto 1fr; column-gap: var(--espaco-4);
        align-items: center; padding: var(--espaco-4);
      }
      .forma svg { grid-row: span 2; margin: 0; width: 2rem; height: 2rem; }
    }
    /* notebook: tudo cabe sem rolar, total e botão lado a lado */
    @media (orientation: landscape) and (min-width: 701px) and (max-height: 900px) {
      .corpo { gap: var(--espaco-4); padding-top: var(--espaco-3); }
      .rotulo { font-size: 1.2rem; }
      .ajuda { margin-bottom: var(--espaco-2); font-size: 0.9rem; }
      input { min-height: 3.25rem; font-size: 1.1rem; }
      .formas legend { margin-bottom: var(--espaco-2); }
      .forma {
        min-height: 0; padding: var(--espaco-3) var(--espaco-4);
        grid-template-columns: auto 1fr; column-gap: var(--espaco-3); align-items: center;
      }
      .forma svg { grid-row: span 2; width: 1.8rem; height: 1.8rem; margin: 0; }
      .forma-nome { font-size: 1.15rem; }
      .forma-descricao { font-size: 0.85rem; }
      .fechamento { grid-template-columns: auto minmax(0, 22rem); justify-content: space-between; align-items: center; padding-block: var(--espaco-3); }
      .total { flex-direction: column; align-items: start; gap: 0; }
      .total .preco { font-size: 1.8rem; }
      .fechamento .btn { min-height: 3.5rem; font-size: 1.15rem; }
    }
  `,
})
export class Pagamento implements OnInit {
  protected readonly carrinho = inject(Carrinho);
  private api = inject(TotemApi);
  private router = inject(Router);

  protected readonly opcoes = OPCOES;
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    if (this.carrinho.vazio()) this.router.navigateByUrl('/totem/cardapio');
  }

  protected async confirmar(): Promise<void> {
    const forma = this.carrinho.formaPagamento();
    if (!forma || this.enviando()) return;

    this.enviando.set(true);
    this.erro.set(null);

    try {
      const pedido = await firstValueFrom(
        this.api.criarPedido({
          nome_cliente: this.carrinho.nomeCliente().trim() || null,
          forma_pagamento: forma,
          itens: this.carrinho.itensParaApi(),
        }),
      );

      this.carrinho.limpar();
      await this.router.navigate(['/totem/pedido', pedido.codigo], { replaceUrl: true });
    } catch (e) {
      this.erro.set(e instanceof FalhaPedido ? e.message : 'Não foi possível enviar o pedido. Tente de novo.');
    } finally {
      this.enviando.set(false);
    }
  }
}
