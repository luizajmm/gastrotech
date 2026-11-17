import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  texto: string;
  tipo: 'sucesso' | 'erro';
}

@Injectable({ providedIn: 'root' })
export class Avisos {
  private proximo = 1;
  readonly lista = signal<Aviso[]>([]);

  sucesso(texto: string): void {
    this.mostrar(texto, 'sucesso');
  }

  erro(e: unknown, padrao = 'Não foi possível concluir.'): void {
    this.mostrar(e instanceof Error ? e.message : padrao, 'erro');
  }

  fechar(id: number): void {
    this.lista.update((l) => l.filter((a) => a.id !== id));
  }

  private mostrar(texto: string, tipo: Aviso['tipo']): void {
    const id = this.proximo++;
    this.lista.update((l) => [...l.slice(-2), { id, texto, tipo }]);
    setTimeout(() => this.fechar(id), tipo === 'erro' ? 6000 : 3500);
  }
}
