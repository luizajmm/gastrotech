import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const ICONES: Record<string, string> = {
  destaques:
    'M12 3c1 3.6 5 5.6 5 10.2a5 5 0 0 1-10 0c0-2.6 1.4-4.1 2.5-5.1.3 1.6 1 2.6 2 3 .1-3 .5-5.5.5-8.1z',
  combo:
    'M3 10a6 4.5 0 0 1 12 0zM3 13h12M4 16h10v1.5A1.5 1.5 0 0 1 12.5 19h-7A1.5 1.5 0 0 1 4 17.5zM17 8h4l-1 12h-2zM19 8l1-4',
  burger: 'M4 11a8 6.5 0 0 1 16 0zM3 14.5h18M5 17.5v.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-.5',
  porcao: 'M5.5 10l1.6 10h9.8l1.6-10zM8.5 10V4.5M11 10V3.5M13.5 10V4M16 10V5.5',
  bebida: 'M6 7h12l-1.5 13h-9zM6.6 11.5h10.8M12 7l2-4h3',
  sobremesa: 'M7 10h10l-1.2 10H8.2zM6 10a6 3.5 0 0 1 12 0M13 6.5l2-3.5',
  molho: 'M12 3c3.5 4.5 6 7.6 6 10.5a6 6 0 0 1-12 0C6 10.6 8.5 7.5 12 3z',
  outros: 'M12 4a8 8 0 1 0 0 16 8 8 0 1 0 0-16zM12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8z',
};

@Component({
  selector: 'gt-icone-categoria',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
         stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path [attr.d]="caminho()" />
    </svg>
  `,
  styles: `
    :host { display: inline-flex; width: 1.75rem; height: 1.75rem; }
    svg { width: 100%; height: 100%; }
  `,
})
export class IconeCategoria {
  readonly nome = input<string | null>('outros');
  protected readonly caminho = computed(() => ICONES[this.nome() ?? 'outros'] ?? ICONES['outros']);
}
