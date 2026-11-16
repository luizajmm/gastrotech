import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CONFIG } from '../config';
import { Sessao } from './sessao';

type Canal = { listen(evento: string, cb: (dados: unknown) => void): Canal };

/** Parte do Laravel Echo que usamos (evita depender dos tipos internos da biblioteca). */
interface EchoMinimo {
  channel(nome: string): Canal;
  private(nome: string): Canal;
  leave(nome: string): void;
}

/**
 * Conexão com o Laravel Reverb (WebSockets).
 * As bibliotecas só são carregadas quando alguma tela precisa de tempo real.
 */
@Injectable({ providedIn: 'root' })
export class TempoReal {
  private sessao = inject(Sessao);
  private conexao?: Promise<EchoMinimo>;

  /** Canal aberto (acompanhamento do pedido pelo cliente). */
  canalPublico<T>(canal: string, evento: string): Observable<T> {
    return this.ouvir<T>(canal, [evento], false);
  }

  /** Canal da equipe: o servidor confere o login antes de liberar. */
  canalPrivado<T>(canal: string, eventos: string[]): Observable<T> {
    return this.ouvir<T>(canal, eventos, true);
  }

  private ouvir<T>(canal: string, eventos: string[], privado: boolean): Observable<T> {
    return new Observable<T>((assinante) => {
      let ativo = true;
      let echo: EchoMinimo | undefined;

      this.conectar()
        .then((e) => {
          if (!ativo) return;
          echo = e;
          const c = privado ? e.private(canal) : e.channel(canal);
          for (const evento of eventos) c.listen(`.${evento}`, (dados) => assinante.next(dados as T));
        })
        .catch((erro) => console.warn('Tempo real indisponível; usando consultas periódicas.', erro));

      return () => {
        ativo = false;
        echo?.leave(canal);
      };
    });
  }

  private conectar(): Promise<EchoMinimo> {
    this.conexao ??= Promise.all([import('laravel-echo'), import('pusher-js')]).then(([echoModulo, pusherModulo]) => {
      (window as unknown as { Pusher: unknown }).Pusher = pusherModulo.default;

      const Echo = echoModulo.default as unknown as new (opcoes: Record<string, unknown>) => EchoMinimo;

      return new Echo({
        broadcaster: 'reverb',
        key: CONFIG.reverb.chave,
        wsHost: CONFIG.reverb.host,
        wsPort: CONFIG.reverb.porta,
        wssPort: CONFIG.reverb.porta,
        forceTLS: CONFIG.reverb.tls,
        enabledTransports: ['ws', 'wss'],
        // Autorização dos canais privados com o token da sessão (rota /api/broadcasting/auth)
        authorizer: (canal: { name: string }) => ({
          authorize: (socketId: string, pronto: (erro: unknown, dados: unknown) => void) => {
            fetch(`${CONFIG.apiUrl}/broadcasting/auth`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${this.sessao.token() ?? ''}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ socket_id: socketId, channel_name: canal.name }),
            })
              .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
              .then((dados) => pronto(null, dados))
              .catch((erro) => pronto(erro, null));
          },
        }),
      });
    });

    return this.conexao;
  }
}
