import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation, withInMemoryScrolling, withViewTransitions } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { routes } from './app.routes';
import { CONFIG } from './config';
import { tokenInterceptor } from './core/autenticacao';
import { CozinhaApi } from './core/cozinha-api';
import { CozinhaApiDemo } from './core/cozinha-api-demo';
import { CozinhaApiHttp } from './core/cozinha-api-http';
import { PainelApi } from './core/painel-api';
import { PainelApiDemo } from './core/painel-api-demo';
import { PainelApiHttp } from './core/painel-api-http';
import { TotemApi } from './core/totem-api';
import { TotemApiDemo } from './core/totem-api-demo';
import { TotemApiHttp } from './core/totem-api-http';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Rotas com # funcionam em qualquer servidor (XAMPP, php artisan serve) sem configurar nada
      withHashLocation(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([tokenInterceptor])),
    { provide: CozinhaApi, useClass: CONFIG.modoDemonstracao ? CozinhaApiDemo : CozinhaApiHttp },
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    CONFIG.modoDemonstracao ? { provide: PainelApi, useExisting: PainelApiDemo } : { provide: PainelApi, useClass: PainelApiHttp },
    { provide: TotemApi, useClass: CONFIG.modoDemonstracao ? TotemApiDemo : TotemApiHttp },
  ],
};
