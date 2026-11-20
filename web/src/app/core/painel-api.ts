import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { CONFIG } from '../config';
import {
  Caixa,
  CaixaAtual,
  CategoriaPainel,
  ClientesFidelidade,
  Configuracoes,
  Cupom,
  CupomForm,
  Dashboard,
  ErroApi,
  FiltroPedidos,
  Insumo,
  InsumoForm,
  Movimento,
  Paginado,
  Pedido,
  ProdutoForm,
  ProdutoPainel,
  Totem,
  Usuario,
  Vendas,
} from './modelos';

export interface FiltroProdutos {
  busca: string;
  categoria_id: number | null;
  situacao: '' | 'ativos' | 'inativos' | 'estoque_baixo';
}

export interface UsuarioForm {
  nome: string;
  email: string;
  senha: string;
  papel: string;
  ativo: boolean;
}

export interface CategoriaForm {
  nome: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
  ativo: boolean;
}

export interface TotemForm {
  codigo: string;
  localizacao: string;
  status: 'online' | 'offline' | 'manutencao';
}

export interface MovimentoForm {
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
}


export class FalhaFormulario extends Error {
  constructor(
    message: string,
    readonly campos: Record<string, string> = {},
  ) {
    super(message);
  }
}

type Dados<T> = { data: T };

@Injectable({ providedIn: 'root' })
export class PainelApi {
  private http = inject(HttpClient);
  private url = CONFIG.apiUrl;

  dashboard(): Observable<Dashboard> {
    return this.get<Dashboard>('dashboard');
  }

  pedidos(filtro: FiltroPedidos): Observable<Paginado<Pedido>> {
    let params = new HttpParams().set('status', filtro.status).set('page', filtro.pagina).set('por_pagina', 15);
    if (filtro.busca.trim()) params = params.set('busca', filtro.busca.trim());
    return this.http.get<Paginado<Pedido>>(`${this.url}/pedidos`, { params }).pipe(catchError(traduzir));
  }

  cancelarPedido(id: number): Observable<Pedido> {
    return this.post<Pedido>(`pedidos/${id}/cancelar`, {});
  }

  categorias(): Observable<CategoriaPainel[]> {
    return this.get<CategoriaPainel[]>('categorias');
  }

  salvarCategoria(dados: CategoriaForm, id?: number): Observable<CategoriaPainel> {
    return this.salvar<CategoriaPainel>('categorias', dados, id);
  }

  excluirCategoria(id: number): Observable<void> {
    return this.excluir(`categorias/${id}`);
  }

  produtos(filtro: FiltroProdutos): Observable<ProdutoPainel[]> {
    let params = new HttpParams();
    if (filtro.busca.trim()) params = params.set('busca', filtro.busca.trim());
    if (filtro.categoria_id) params = params.set('categoria_id', filtro.categoria_id);
    if (filtro.situacao) params = params.set('situacao', filtro.situacao);
    return this.get<ProdutoPainel[]>('produtos', params);
  }

  salvarProduto(dados: ProdutoForm, id?: number): Observable<ProdutoPainel> {
    return this.salvar<ProdutoPainel>('produtos', dados, id);
  }

  excluirProduto(id: number): Observable<void> {
    return this.excluir(`produtos/${id}`);
  }

  enviarImagem(id: number, arquivo: File): Observable<ProdutoPainel> {
    return this.upload<ProdutoPainel>(`produtos/${id}/imagem`, arquivo);
  }

  removerImagem(id: number): Observable<ProdutoPainel> {
    return this.http
      .delete<Dados<ProdutoPainel>>(`${this.url}/produtos/${id}/imagem`)
      .pipe(map((r) => r.data), catchError(traduzir));
  }

  vendas(inicio: string, fim: string): Observable<Vendas> {
    return this.get<Vendas>('financeiro/vendas', new HttpParams().set('data_inicio', inicio).set('data_fim', fim));
  }

  pedidosPagos(inicio: string, fim: string): Observable<Pedido[]> {
    return this.get<Pedido[]>('financeiro/vendas/pedidos', new HttpParams().set('data_inicio', inicio).set('data_fim', fim));
  }

  caixa(): Observable<CaixaAtual | null> {
    return this.get<CaixaAtual | null>('financeiro/caixa');
  }

  abrirCaixa(saldoInicial: number): Observable<CaixaAtual> {
    return this.post<CaixaAtual>('financeiro/caixa/abrir', { saldo_inicial: saldoInicial });
  }

  fecharCaixa(): Observable<CaixaAtual> {
    return this.post<CaixaAtual>('financeiro/caixa/fechar', {});
  }

  historicoCaixas(): Observable<Caixa[]> {
    return this.get<Caixa[]>('financeiro/caixas');
  }

  movimentos(): Observable<Movimento[]> {
    return this.get<Movimento[]>('financeiro/movimentos');
  }

  registrarMovimento(dados: MovimentoForm): Observable<Movimento> {
    return this.post<Movimento>('financeiro/movimentos', dados);
  }

  cupons(): Observable<Cupom[]> {
    return this.get<Cupom[]>('cupons');
  }

  salvarCupom(dados: CupomForm, id?: number): Observable<Cupom> {
    return this.salvar<Cupom>('cupons', dados, id);
  }

  insumos(): Observable<Insumo[]> {
    return this.get<Insumo[]>('insumos');
  }

  salvarInsumo(dados: InsumoForm, id?: number): Observable<Insumo> {
    return this.salvar<Insumo>('insumos', dados, id);
  }

  entradaInsumo(id: number, quantidade: number): Observable<Insumo> {
    return this.post<Insumo>(`insumos/${id}/entrada`, { quantidade });
  }

  excluirInsumo(id: number): Observable<void> {
    return this.excluir(`insumos/${id}`);
  }

  clientesFidelidade(): Observable<ClientesFidelidade> {
    return this.get<ClientesFidelidade>('clientes');
  }

  excluirCupom(id: number): Observable<void> {
    return this.excluir(`cupons/${id}`);
  }

  usuarios(): Observable<Usuario[]> {
    return this.get<Usuario[]>('usuarios');
  }

  salvarUsuario(dados: UsuarioForm, id?: number): Observable<Usuario> {
    const corpo: Partial<UsuarioForm> = { ...dados };
    if (id && !dados.senha) delete corpo.senha; // senha vazia = não troca
    return this.salvar<Usuario>('usuarios', corpo, id);
  }

  excluirUsuario(id: number): Observable<void> {
    return this.excluir(`usuarios/${id}`);
  }

  configuracoes(): Observable<Configuracoes> {
    return this.get<Configuracoes>('configuracoes');
  }

  salvarConfiguracoes(
    dados: Partial<Omit<Configuracoes, 'fidelidade'>> & { fidelidade_ativa?: boolean; fidelidade_meta?: number; fidelidade_premio?: number },
  ): Observable<Configuracoes> {
    return this.http
      .put<Dados<Configuracoes>>(`${this.url}/configuracoes`, dados)
      .pipe(map((r) => r.data), catchError(traduzir));
  }

  enviarLogo(arquivo: File): Observable<Configuracoes> {
    return this.upload<Configuracoes>('configuracoes/logo', arquivo);
  }

  totens(): Observable<Totem[]> {
    return this.get<Totem[]>('totens');
  }

  salvarTotem(dados: TotemForm, id?: number): Observable<Totem> {
    return this.salvar<Totem>('totens', dados, id);
  }

  excluirTotem(id: number): Observable<void> {
    return this.excluir(`totens/${id}`);
  }

  /* ---------- Auxiliares ---------- */

  private get<T>(rota: string, params?: HttpParams): Observable<T> {
    return this.http.get<Dados<T>>(`${this.url}/${rota}`, { params }).pipe(
      map((r) => r.data),
      catchError(traduzir),
    );
  }

  private post<T>(rota: string, corpo: unknown): Observable<T> {
    return this.http.post<Dados<T>>(`${this.url}/${rota}`, corpo).pipe(
      map((r) => r.data),
      catchError(traduzir),
    );
  }

  private salvar<T>(recurso: string, corpo: unknown, id?: number): Observable<T> {
    const pedido = id
      ? this.http.put<Dados<T>>(`${this.url}/${recurso}/${id}`, corpo)
      : this.http.post<Dados<T>>(`${this.url}/${recurso}`, corpo);
    return pedido.pipe(
      map((r) => r.data),
      catchError(traduzir),
    );
  }

  private excluir(rota: string): Observable<void> {
    return this.http.delete(`${this.url}/${rota}`).pipe(
      map(() => undefined),
      catchError(traduzir),
    );
  }

  private upload<T>(rota: string, arquivo: File): Observable<T> {
    const corpo = new FormData();
    corpo.append('imagem', arquivo);
    return this.http.post<Dados<T>>(`${this.url}/${rota}`, corpo).pipe(
      map((r) => r.data),
      catchError(traduzir),
    );
  }
}

function traduzir(erro: HttpErrorResponse): Observable<never> {
  if (erro.status === 0) {
    return throwError(() => new FalhaFormulario('Sem conexão com o sistema. Confira se a API está ligada.'));
  }

  if (erro.status === 403) {
    return throwError(() => new FalhaFormulario('Seu usuário não tem permissão para fazer isso.'));
  }

  const corpo = erro.error as ErroApi | null;
  const campos: Record<string, string> = {};
  for (const [campo, mensagens] of Object.entries(corpo?.errors ?? {})) {
    campos[campo] = mensagens[0];
  }

  const primeira = Object.values(campos)[0];
  return throwError(
    () => new FalhaFormulario(primeira ?? corpo?.message ?? 'Não foi possível concluir. Tente de novo.', campos),
  );
}
