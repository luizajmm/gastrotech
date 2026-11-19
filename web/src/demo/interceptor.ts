import { HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { defer, delay, map, Observable, of, throwError } from 'rxjs';
import { CONFIG } from '../app/config';
import { FiltroPedidos, NovoPedido, Pedido } from '../app/core/modelos';
import { BancoDemo } from './banco';

// na demonstração não tem api: as chamadas que iriam pro laravel são respondidas aqui, com o banco em memória
export const demoInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(CONFIG.apiUrl)) return next(req);
  const banco = inject(BancoDemo);
  const rota = req.url.slice(CONFIG.apiUrl.length).split('?')[0];

  let resposta: Observable<unknown>;
  try {
    resposta = rotear(banco, req, rota);
  } catch (e) {
    resposta = throwError(() => e);
  }

  return resposta.pipe(
    map((body) => new HttpResponse({ status: 200, body, url: req.url })),
    (o) =>
      new Observable<HttpResponse<unknown>>((assinante) =>
        o.subscribe({
          next: (r) => assinante.next(r),
          complete: () => assinante.complete(),
          error: (e) => assinante.error(erro(e, req.url)),
        }),
      ),
  );
};

function rotear(banco: BancoDemo, req: HttpRequest<unknown>, rota: string): Observable<unknown> {
  const p = req.params;
  const corpo = (req.body ?? {}) as Record<string, any>;
  const id = Number(rota.split('/')[2]);
  const comData = (o: Observable<unknown>) => o.pipe(map((data) => ({ data })));
  const agora = <T>(regra: () => T) => defer(() => of(regra())).pipe(delay(200));
  const metodo = req.method;
  const e = (m: string, r: RegExp) => metodo === m && r.test(rota);

  // totem
  if (e('GET', /^\/totem\/cardapio$/)) return agora(() => banco.cardapioTotem());
  if (e('POST', /^\/totem\/pedidos$/)) return comData(agora(() => banco.acompanhamento(banco.criarPedidoTotem(corpo as NovoPedido))));
  if (e('GET', /^\/totem\/pedidos\/[^/]+$/)) {
    const codigo = decodeURIComponent(rota.split('/')[3]).toUpperCase();
    return comData(
      agora(() => {
        const pedido = banco.pedidos$.value.find((x) => x.codigo === codigo);
        if (!pedido) throw new HttpErrorResponse({ status: 404, error: { message: 'Pedido não encontrado.' } });
        return banco.acompanhamento(pedido);
      }),
    );
  }

  // login
  if (e('POST', /^\/login$/)) return agora(() => ({ token: 'demonstracao', usuario: banco.autenticar(corpo['email'], corpo['senha']) }));
  if (e('POST', /^\/logout$/)) return agora(() => ({}));

  // painel
  if (e('GET', /^\/dashboard$/)) return comData(banco.dashboard());

  // pedidos e cozinha
  if (e('GET', /^\/pedidos$/)) {
    if (p.get('status') === 'ativos') {
      return comData(agora(() => banco.pedidos$.value.filter((x) => ['recebido', 'em_preparo', 'pronto'].includes(x.status.valor))));
    }
    const filtro: FiltroPedidos = {
      status: (p.get('status') ?? 'todos') as FiltroPedidos['status'],
      busca: p.get('busca') ?? '',
      pagina: Number(p.get('page') ?? 1),
    };
    return banco.pedidos(filtro);
  }
  const acoes: Record<string, (id: number) => Pedido> = {
    avancar: (i) => banco.avancarPedido(i),
    cancelar: (i) => banco.cancelarPedido(i),
    pagamento: (i) => banco.confirmarPagamentoPedido(i),
  };
  const acao = rota.match(/^\/pedidos\/\d+\/(avancar|cancelar|pagamento)$/);
  if (metodo === 'POST' && acao) return comData(agora(() => acoes[acao[1]](id)));

  // cardápio
  if (e('GET', /^\/categorias$/)) return comData(banco.categorias());
  if (e('POST', /^\/categorias$/)) return comData(banco.salvarCategoria(corpo as any));
  if (e('PUT', /^\/categorias\/\d+$/)) return comData(banco.salvarCategoria(corpo as any, id));
  if (e('DELETE', /^\/categorias\/\d+$/)) return banco.excluirCategoria(id).pipe(map(() => ({})));
  if (e('GET', /^\/produtos$/)) {
    return comData(
      banco.produtos({
        busca: p.get('busca') ?? '',
        categoria_id: p.get('categoria_id') ? Number(p.get('categoria_id')) : null,
        situacao: (p.get('situacao') ?? '') as any,
      }),
    );
  }
  if (e('POST', /^\/produtos$/)) return comData(banco.salvarProduto(corpo as any));
  if (e('PUT', /^\/produtos\/\d+$/)) return comData(banco.salvarProduto(corpo as any, id));
  if (e('DELETE', /^\/produtos\/\d+$/)) return banco.excluirProduto(id).pipe(map(() => ({})));
  if (e('POST', /^\/produtos\/\d+\/imagem$/)) return comData(banco.enviarImagem(id, (req.body as FormData).get('imagem') as File));
  if (e('DELETE', /^\/produtos\/\d+\/imagem$/)) return comData(banco.removerImagem(id));

  // financeiro
  if (e('GET', /^\/financeiro\/vendas$/)) return comData(banco.vendas(p.get('data_inicio') ?? '', p.get('data_fim') ?? ''));
  if (e('GET', /^\/financeiro\/caixa$/)) return comData(banco.caixa());
  if (e('GET', /^\/financeiro\/caixas$/)) return comData(banco.historicoCaixas());
  if (e('GET', /^\/financeiro\/movimentos$/)) return comData(banco.movimentos());
  if (e('POST', /^\/financeiro\/caixa\/abrir$/)) return comData(banco.abrirCaixa(Number(corpo['saldo_inicial'])));
  if (e('POST', /^\/financeiro\/caixa\/fechar$/)) return comData(banco.fecharCaixa());
  if (e('POST', /^\/financeiro\/movimentos$/)) return comData(banco.registrarMovimento(corpo as any));

  // equipe
  if (e('GET', /^\/usuarios$/)) return comData(banco.usuarios());
  if (e('POST', /^\/usuarios$/)) return comData(banco.salvarUsuario(corpo as any));
  if (e('PUT', /^\/usuarios\/\d+$/)) return comData(banco.salvarUsuario(corpo as any, id));
  if (e('DELETE', /^\/usuarios\/\d+$/)) return banco.excluirUsuario(id).pipe(map(() => ({})));

  // configurações e totens
  if (e('GET', /^\/configuracoes$/)) return comData(banco.configuracoes());
  if (e('PUT', /^\/configuracoes$/)) return comData(banco.salvarConfiguracoes(corpo as any));
  if (e('POST', /^\/configuracoes\/logo$/)) return comData(banco.enviarLogo((req.body as FormData).get('imagem') as File));
  if (e('GET', /^\/totens$/)) return comData(banco.totens());
  if (e('POST', /^\/totens$/)) return comData(banco.salvarTotem(corpo as any));
  if (e('PUT', /^\/totens\/\d+$/)) return comData(banco.salvarTotem(corpo as any, id));
  if (e('DELETE', /^\/totens\/\d+$/)) return banco.excluirTotem(id).pipe(map(() => ({})));

  throw new HttpErrorResponse({ status: 404, error: { message: `A demonstração não tem a rota ${metodo} ${rota}.` } });
}

// transforma o erro do banco no mesmo formato que o laravel devolve (422 com os campos)
function erro(e: unknown, url: string): HttpErrorResponse {
  if (e instanceof HttpErrorResponse) return new HttpErrorResponse({ status: e.status, error: e.error, url });
  const mensagem = e instanceof Error ? e.message : 'Não foi possível concluir.';
  const campos = (e as { campos?: Record<string, string> }).campos ?? {};
  const errors = Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, [v]]));
  return new HttpErrorResponse({ status: 422, error: { message: mensagem, errors }, url });
}
