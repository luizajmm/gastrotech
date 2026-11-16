/**
 * Configuração do front-end.
 *
 * modoDemonstracao: true  → usa dados de exemplo, sem precisar da API rodando.
 * modoDemonstracao: false → conversa com a API Laravel (rode o iniciar.bat da API antes).
 */
export const CONFIG = {
  modoDemonstracao: true,

  apiUrl: 'http://127.0.0.1:8000/api',

  /** Totem físico que está rodando esta tela (cadastrado em Configurações > Totens). */
  totem: 'TOTEM-01',

  /** Volta para a tela inicial se ninguém tocar na tela por este tempo. */
  inatividadeSegundos: 90,

  /** Tempo real (Laravel Reverb). Os valores batem com o .env da API. */
  reverb: {
    chave: 'gastrotech-chave-local',
    host: '127.0.0.1',
    porta: 8080,
    tls: false,
  },
};
