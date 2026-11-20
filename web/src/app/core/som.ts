import { Injectable, signal } from '@angular/core';

const CHAVE = 'gastrotech.som';

// o navegador só deixa tocar som depois que alguém mexe na página.
// o som já vem ligado e destrava no primeiro toque em qualquer lugar da tela;
// enquanto não destravar, o botão avisa
@Injectable({ providedIn: 'root' })
export class Som {
  readonly ligado = signal(lerPreferencia());
  readonly bloqueado = signal(true);
  private contexto?: AudioContext;

  constructor() {
    if (this.ligado()) this.preparar();

    const destravar = (e: Event) => {
      // o clique no próprio botão já é tratado pelo alternar()
      if ((e.target as Element | null)?.closest?.('[data-som]')) return;
      if (this.ligado()) this.preparar();
    };
    document.addEventListener('pointerdown', destravar, true);
    document.addEventListener('keydown', destravar, true);
  }

  alternar(): void {
    if (this.ligado() && !this.bloqueado()) {
      this.ligado.set(false);
      salvarPreferencia(false);
      return;
    }
    this.ligado.set(true);
    salvarPreferencia(true);
    this.preparar();
    this.tocar();
  }

  // duas notas curtas, tipo campainha de balcão
  tocar(): void {
    const ctx = this.contexto;
    if (!this.ligado() || !ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

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

  private preparar(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.contexto) {
      this.contexto = new AudioContext();
      this.contexto.onstatechange = () => this.bloqueado.set(this.contexto?.state !== 'running');
    }
    if (this.contexto.state === 'suspended') void this.contexto.resume().catch(() => undefined);
    this.bloqueado.set(this.contexto.state !== 'running');
  }
}

function lerPreferencia(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== 'desligado';
  } catch {
    return true;
  }
}

function salvarPreferencia(ligado: boolean): void {
  try {
    localStorage.setItem(CHAVE, ligado ? 'ligado' : 'desligado');
  } catch {
    // sem localStorage só não lembra a escolha
  }
}
