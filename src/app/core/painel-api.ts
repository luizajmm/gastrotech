import { Observable } from 'rxjs';
import {
  Caixa,
  CaixaAtual,
  CategoriaPainel,
  Configuracoes,
  Dashboard,
  FiltroPedidos,
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

/**
 * Tudo que o painel administrativo pede à API.
 * Implementações: HTTP (API Laravel) e demonstração (dados locais).
 * Erros de validação chegam como FalhaFormulario, com a mensagem de cada campo.
 */
export abstract class PainelApi {
  abstract dashboard(): Observable<Dashboard>;

  abstract pedidos(filtro: FiltroPedidos): Observable<Paginado<Pedido>>;

  abstract categorias(): Observable<CategoriaPainel[]>;
  abstract salvarCategoria(dados: CategoriaForm, id?: number): Observable<CategoriaPainel>;
  abstract excluirCategoria(id: number): Observable<void>;

  abstract produtos(filtro: FiltroProdutos): Observable<ProdutoPainel[]>;
  abstract salvarProduto(dados: ProdutoForm, id?: number): Observable<ProdutoPainel>;
  abstract excluirProduto(id: number): Observable<void>;
  abstract enviarImagem(id: number, arquivo: File): Observable<ProdutoPainel>;
  abstract removerImagem(id: number): Observable<ProdutoPainel>;

  abstract vendas(inicio: string, fim: string): Observable<Vendas>;
  abstract caixa(): Observable<CaixaAtual | null>;
  abstract abrirCaixa(saldoInicial: number): Observable<CaixaAtual>;
  abstract fecharCaixa(): Observable<CaixaAtual>;
  abstract historicoCaixas(): Observable<Caixa[]>;
  abstract movimentos(): Observable<Movimento[]>;
  abstract registrarMovimento(dados: MovimentoForm): Observable<Movimento>;

  abstract usuarios(): Observable<Usuario[]>;
  abstract salvarUsuario(dados: UsuarioForm, id?: number): Observable<Usuario>;
  abstract excluirUsuario(id: number): Observable<void>;

  abstract configuracoes(): Observable<Configuracoes>;
  abstract salvarConfiguracoes(dados: Partial<Configuracoes>): Observable<Configuracoes>;
  abstract enviarLogo(arquivo: File): Observable<Configuracoes>;

  abstract totens(): Observable<Totem[]>;
  abstract salvarTotem(dados: TotemForm, id?: number): Observable<Totem>;
  abstract excluirTotem(id: number): Observable<void>;
}

/** Erro com a mensagem geral e as mensagens de cada campo (vindas do 422 do Laravel). */
export class FalhaFormulario extends Error {
  constructor(
    message: string,
    readonly campos: Record<string, string> = {},
  ) {
    super(message);
  }
}
