import { Pipe, PipeTransform } from '@angular/core';

// 45 → "45 min", 75 → "1h 15min", 120 → "2h", 3000 → "2 dias"
export function duracao(minutos: number): string {
  const m = Math.max(0, Math.round(minutos));
  if (m < 60) return `${m} min`;
  if (m < 24 * 60) {
    const h = Math.floor(m / 60);
    const resto = m % 60;
    return resto ? `${h}h ${resto}min` : `${h}h`;
  }
  const dias = Math.floor(m / (24 * 60));
  return dias === 1 ? '1 dia' : `${dias} dias`;
}

@Pipe({ name: 'duracao' })
export class DuracaoPipe implements PipeTransform {
  transform(minutos: number | null | undefined): string {
    return duracao(minutos ?? 0);
  }
}
