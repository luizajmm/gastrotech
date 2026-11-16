import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CONFIG } from './config';
import { TrocarTela } from './shared/trocar-tela';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TrocarTela],
  template: `
    <router-outlet />
    @if (demonstracao) {
      <gt-trocar-tela />
    }
  `,
})
export class App {
  protected readonly demonstracao = CONFIG.modoDemonstracao;
}
