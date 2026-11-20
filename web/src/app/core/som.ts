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

  // sino de balcão, batido duas vezes ("pedido!")
  tocar(): void {
    const ctx = this.contexto;
    if (!this.ligado() || !ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    tocarSino(ctx, ctx.currentTime);
    tocarSino(ctx, ctx.currentTime + 0.32, 0.8);
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

// sino é uma soma de frequências que não são múltiplas uma da outra,
// com ataque seco e as mais agudas sumindo mais rápido
const PARCIAIS = [
  { razao: 1, volume: 1, dura: 1.6 },
  { razao: 2.76, volume: 0.45, dura: 0.9 },
  { razao: 5.4, volume: 0.22, dura: 0.45 },
  { razao: 8.93, volume: 0.1, dura: 0.25 },
];

export function tocarSino(ctx: BaseAudioContext, inicio: number, forca = 1, base = 1568): void {
  const saida = ctx.createGain();
  saida.gain.value = 0.18 * forca;
  saida.connect(ctx.destination);

  for (const p of PARCIAIS) {
    const osc = ctx.createOscillator();
    const volume = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = base * p.razao;
    volume.gain.setValueAtTime(0, inicio);
    volume.gain.linearRampToValueAtTime(p.volume, inicio + 0.004);
    volume.gain.exponentialRampToValueAtTime(0.0001, inicio + p.dura);
    osc.connect(volume).connect(saida);
    osc.start(inicio);
    osc.stop(inicio + p.dura + 0.05);
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
