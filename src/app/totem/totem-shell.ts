import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { CONFIG } from '../config';
import { Carrinho } from '../core/carrinho';
import { Loja } from '../core/loja';

/**
 * Moldura das telas do totem.
 * Se ninguém tocar na tela por um tempo, pergunta se a pessoa ainda está ali
 * e, sem resposta, limpa o pedido e volta ao início para o próximo cliente.
 */
@Component({
  selector: 'gt-totem-shell',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointerdown)': 'registrarAtividade()',
    '(document:keydown)': 'registrarAtividade()',
  },
  template: `
    <router-outlet />

    @if (perguntando()) {
      <div class="aviso" role="alertdialog" aria-labelledby="aviso-titulo" aria-describedby="aviso-texto">
        <div class="aviso-caixa" (pointerdown)="$event.stopPropagation()">
          <h2 id="aviso-titulo">Ainda está aí?</h2>
          <p id="aviso-texto">Seu pedido será apagado em {{ contagem() }} segundos.</p>
          <button class="btn btn-brasa btn-largo" type="button" (click)="continuar()">Continuar pedido</button>
          <button class="btn btn-discreto" type="button" (click)="recomecar()">Recomeçar agora</button>
        </div>
      </div>
    }
  `,
  styles: `
    .aviso {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: grid;
      place-items: center;
      padding: var(--espaco-5);
      background: rgb(0 0 0 / 0.55);
    }
    .aviso-caixa {
      display: grid;
      gap: var(--espaco-4);
      justify-items: center;
      width: min(100%, 30rem);
      padding: var(--espaco-7) var(--espaco-6) var(--espaco-5);
      background: var(--papel);
      border-radius: var(--raio-grande);
      box-shadow: var(--traco-triplo);
      text-align: center;
    }
    h2 { font-size: 2rem; }
    p { font-size: 1.15rem; margin-bottom: var(--espaco-3); }
  `,
})
export class TotemShell implements OnInit {
  private router = inject(Router);
  private carrinho = inject(Carrinho);
  private loja = inject(Loja);
  private destroyRef = inject(DestroyRef);

  protected readonly perguntando = signal(false);
  protected readonly contagem = signal(15);

  private ultimoToque = Date.now();
  private relogio?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.loja.carregar();

    // A cada troca de tela conta como atividade
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.registrarAtividade());

    this.relogio = setInterval(() => this.verificar(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(this.relogio));
  }

  protected registrarAtividade(): void {
    this.ultimoToque = Date.now();
    // Qualquer toque enquanto o aviso está aberto significa "ainda estou aqui"
    if (this.perguntando()) this.perguntando.set(false);
  }

  protected continuar(): void {
    this.perguntando.set(false);
    this.registrarAtividade();
  }

  protected recomecar(): void {
    this.perguntando.set(false);
    this.carrinho.limpar();
    this.router.navigateByUrl('/totem');
  }

  private verificar(): void {
    const naInicial = this.router.url === '/totem';
    // A tela de confirmação tem a própria contagem para voltar ao início
    const naConfirmacao = /^\/totem\/pedido\/[^/]+$/.test(this.router.url);

    if (naInicial || naConfirmacao) {
      this.perguntando.set(false);
      return;
    }

    const parado = (Date.now() - this.ultimoToque) / 1000;

    if (!this.perguntando() && parado >= CONFIG.inatividadeSegundos) {
      this.perguntando.set(true);
      this.contagem.set(15);
      return;
    }

    if (this.perguntando()) {
      const restante = 15 - Math.floor(parado - CONFIG.inatividadeSegundos);
      if (restante <= 0) {
        this.recomecar();
      } else {
        this.contagem.set(restante);
      }
    }
  }
}
