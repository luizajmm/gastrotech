import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, switchMap } from 'rxjs';
import { Acompanhamento } from '../core/modelos';
import { TotemApi } from '../core/totem-api';
import { DinheiroPipe } from '../shared/dinheiro.pipe';

const VOLTAR_EM = 45;

@Component({
  selector: 'gt-confirmacao',
  imports: [DinheiroPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmacao.html',
  styleUrl: './confirmacao.css',
  host: { '(document:pointerdown)': 'segundos.set(' + VOLTAR_EM + ')' },
})
export class Confirmacao implements OnInit {
  private api = inject(TotemApi);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly codigo = input.required<string>();

  protected readonly erro = signal<string | null>(null);
  protected readonly segundos = signal(VOLTAR_EM);

  protected readonly pedido = toSignal<Acompanhamento | null>(
    toObservable(this.codigo).pipe(
      switchMap((codigo) =>
        this.api.observar(codigo).pipe(
          catchError((e) => {
            this.erro.set(e?.message ?? 'Não encontramos esse pedido.');
            return EMPTY;
          }),
        ),
      ),
    ),
    { initialValue: null },
  );

  // 0 recebido ... 3 retirado
  protected readonly etapaAtual = computed(() => {
    const p = this.pedido();
    if (!p) return 0;
    return Math.max(0, p.etapas.findIndex((e) => e.valor === p.status.valor));
  });

  protected readonly progresso = computed(() => {
    const p = this.pedido();
    if (!p) return 0;
    return this.etapaAtual() / (p.etapas.length - 1);
  });

  protected readonly pronto = computed(() => this.pedido()?.status.valor === 'pronto');
  protected readonly cancelado = computed(() => this.pedido()?.status.valor === 'cancelado');
  protected readonly pagarNoCaixa = computed(() => this.pedido()?.status_pagamento.valor === 'pendente');

  ngOnInit(): void {
    const relogio = setInterval(() => {
      const restante = this.segundos() - 1;
      if (restante <= 0) {
        clearInterval(relogio);
        this.router.navigateByUrl('/totem');
      } else {
        this.segundos.set(restante);
      }
    }, 1000);

    this.destroyRef.onDestroy(() => clearInterval(relogio));
  }
}
