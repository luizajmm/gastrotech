import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CozinhaApi } from '../core/cozinha-api';
import { Pedido, StatusPedido } from '../core/modelos';
import { Sessao } from '../core/sessao';
import { AcaoPedido, PedidoCartao } from './pedido-cartao';

interface Coluna {
  status: StatusPedido;
  titulo: string;
  vazio: string;
  pedidos: Pedido[];
}

const TEMPO_DESTAQUE_NOVO = 10_000;

@Component({
  selector: 'gt-cozinha',
  imports: [DatePipe, PedidoCartao],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cozinha.html',
  styleUrl: './cozinha.css',
})
export class Cozinha {
  private api = inject(CozinhaApi);
  protected sessao = inject(Sessao);
  private router = inject(Router);

  protected readonly fila = toSignal(this.api.fila());
  protected readonly agora = signal(Date.now());
  protected readonly aba = signal<StatusPedido>('recebido');
  protected readonly ocupados = signal<ReadonlySet<number>>(new Set());
  protected readonly novos = signal<ReadonlySet<number>>(new Set());
  protected readonly aviso = signal<string | null>(null);
  protected readonly podeAlterar = this.sessao.pode('pedidos');

  protected readonly colunas = computed<Coluna[]>(() => {
    const pedidos = [...(this.fila()?.pedidos ?? [])].sort(
      (a, b) => Date.parse(a.criado_em) - Date.parse(b.criado_em),
    );
    const de = (s: StatusPedido) => pedidos.filter((p) => p.status.valor === s);

    return [
      { status: 'recebido', titulo: 'Recebidos', vazio: 'Nenhum pedido novo.', pedidos: de('recebido') },
      { status: 'em_preparo', titulo: 'Em preparo', vazio: 'Nada no fogo agora.', pedidos: de('em_preparo') },
      { status: 'pronto', titulo: 'Prontos', vazio: 'Nenhum pedido esperando retirada.', pedidos: de('pronto') },
    ];
  });

  protected readonly atrasados = computed(
    () =>
      (this.fila()?.pedidos ?? []).filter(
        (p) =>
          (p.status.valor === 'recebido' || p.status.valor === 'em_preparo') &&
          (this.agora() - Date.parse(p.criado_em)) / 60_000 > p.tempo_estimado_min,
      ).length,
  );

  private vistos?: Set<number>;

  constructor() {
    const relogio = setInterval(() => this.agora.set(Date.now()), 15_000);
    inject(DestroyRef).onDestroy(() => clearInterval(relogio));

    // destaca pedidos que chegaram depois que a tela abriu
    effect(() => {
      const ids = (this.fila()?.pedidos ?? []).map((p) => p.id);
      if (!this.fila()) return;

      let chegaram: number[];

      if (!this.vistos) {
        // ao abrir a tela, destaca o que chegou no último minuto
        this.vistos = new Set(ids);
        chegaram = (this.fila()?.pedidos ?? [])
          .filter((p) => Date.now() - Date.parse(p.criado_em) < 60_000)
          .map((p) => p.id);
      } else {
        chegaram = ids.filter((id) => !this.vistos!.has(id));
      }

      if (!chegaram.length) return;

      chegaram.forEach((id) => this.vistos!.add(id));
      this.novos.update((atual) => new Set([...atual, ...chegaram]));
      setTimeout(
        () => this.novos.update((atual) => new Set([...atual].filter((id) => !chegaram.includes(id)))),
        TEMPO_DESTAQUE_NOVO,
      );
    });
  }

  protected async executar(pedido: Pedido, acao: AcaoPedido): Promise<void> {
    this.ocupados.update((s) => new Set([...s, pedido.id]));
    this.aviso.set(null);

    try {
      const chamada =
        acao === 'avancar'
          ? this.api.avancar(pedido.id)
          : acao === 'cancelar'
            ? this.api.cancelar(pedido.id)
            : this.api.confirmarPagamento(pedido.id);
      await firstValueFrom(chamada);
    } catch (e) {
      this.aviso.set(`${pedido.codigo}: ${e instanceof Error ? e.message : 'não foi possível atualizar.'}`);
      setTimeout(() => this.aviso.set(null), 6000);
    } finally {
      this.ocupados.update((s) => new Set([...s].filter((id) => id !== pedido.id)));
    }
  }

  protected async sair(): Promise<void> {
    await this.sessao.sair();
    await this.router.navigateByUrl('/entrar');
  }
}
