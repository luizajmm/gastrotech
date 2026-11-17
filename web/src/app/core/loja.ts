import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Cardapio } from './modelos';
import { TotemApi } from './totem-api';

@Injectable({ providedIn: 'root' })
export class Loja {
  private api = inject(TotemApi);

  readonly cardapio = signal<Cardapio | null>(null);
  readonly erro = signal<string | null>(null);
  readonly carregando = signal(false);

  async carregar(forcar = false): Promise<void> {
    if (this.cardapio() && !forcar) return;

    this.carregando.set(true);
    this.erro.set(null);

    try {
      this.cardapio.set(await firstValueFrom(this.api.cardapio()));
    } catch (e) {
      this.erro.set(e instanceof Error ? e.message : 'Não foi possível carregar o cardápio.');
    } finally {
      this.carregando.set(false);
    }
  }
}
