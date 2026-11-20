import { Injectable, signal } from '@angular/core';

// o navegador só deixa tocar som depois que alguém clica na página,
// por isso a tela mostra um botão pra ligar
@Injectable({ providedIn: 'root' })
export class Som {
  readonly ligado = signal(false);
  private contexto?: AudioContext;

  ligar(): void {
    this.contexto ??= new AudioContext();
    void this.contexto.resume();
    this.ligado.set(true);
    this.tocar();
  }

  desligar(): void {
    this.ligado.set(false);
  }

  // duas notas curtas, tipo campainha de balcão
  tocar(): void {
    const ctx = this.contexto;
    if (!this.ligado() || !ctx) return;

    [880, 1320].forEach((freq, i) => {
      const inicio = ctx.currentTime + i * 0.18;
      const osc = ctx.createOscillator();
      const volume = ctx.createGain();
      osc.frequency.value = freq;
      volume.gain.setValueAtTime(0.25, inicio);
      volume.gain.exponentialRampToValueAtTime(0.001, inicio + 0.35);
      osc.connect(volume).connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.35);
    });
  }
}
