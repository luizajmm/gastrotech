import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { CONFIG } from '../config';
import { Sessao } from './sessao';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const sessao = inject(Sessao);
  const router = inject(Router);
  const token = sessao.token();

  const pedido =
    token && req.url.startsWith(CONFIG.apiUrl)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      : req.clone({ setHeaders: { Accept: 'application/json' } });

  return next(pedido).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status === 401 && token) {
        sessao.limpar();
        router.navigate(['/entrar'], { queryParams: { volta: router.url } });
      }
      return throwError(() => erro);
    }),
  );
};

// telas da equipe exigem login
export const exigeLogin: CanActivateFn = (_rota, estado) => {
  if (inject(Sessao).logado()) return true;
  return inject(Router).createUrlTree(['/entrar'], { queryParams: { volta: estado.url } });
};

// só entra quem pode ver a área; os outros voltam pra visão geral do painel
export const exigeArea =
  (area: string): CanActivateFn =>
  () =>
    inject(Sessao).ve(area) || inject(Router).createUrlTree(['/painel']);
