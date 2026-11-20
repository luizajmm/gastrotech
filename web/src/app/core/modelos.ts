
export interface Opcao<T extends string = string> {
  valor: T;
  rotulo: string;
}

export type FormaPagamento = 'pix' | 'cartao' | 'dinheiro';
export type Consumo = 'local' | 'viagem';
export type StatusPedido = 'recebido' | 'em_preparo' | 'pronto' | 'retirado' | 'cancelado';
export type StatusPagamento = 'pendente' | 'pago' | 'estornado';

export interface GrupoPersonalizacao {
  nome: string;
  opcoes: string[];
  obrigatorio: boolean;
}

export interface Produto {
  id: number;
  categoria_id: number | null;
  nome: string;
  descricao: string | null;
  destaques: string[];
  personalizacoes: GrupoPersonalizacao[];
  ingredientes: string | null;
  tags: string[];
  alergenos: string[];
  porcao: string | null;
  calorias: number | null;
  imagem_url: string | null;
  estoque: number;
  preco: number;
  tempo_preparo_min: number;
  destaque: boolean;
  ativo: boolean;
}

export interface Categoria {
  id: number;
  nome: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
  ativo: boolean;
  produtos: Produto[];
}

export interface Loja {
  nome_loja: string;
  frase_totem: string | null;
  logo_url: string | null;
  tempo_espera_min: number;
  fidelidade: RegrasFidelidade;
}

export interface RegrasFidelidade {
  ativa: boolean;
  meta: number;
  premio: number;
}

export interface ConsultaFidelidade extends RegrasFidelidade {
  selos: number;
  pode_resgatar: boolean;
}

export interface ClientesFidelidade {
  regras: RegrasFidelidade;
  total: number;
  clientes: { id: number; telefone: string; selos: number; resgates: number; pedidos: number; ultimo_pedido_em: string | null }[];
}

export interface Cardapio {
  loja: Loja;
  categorias: Categoria[];
}

export interface ItemNovoPedido {
  produto_id: number;
  quantidade: number;
  personalizacoes?: Record<string, string>;
  observacao?: string | null;
}

export interface NovoPedido {
  nome_cliente?: string | null;
  forma_pagamento: FormaPagamento;
  consumo: Consumo;
  cupom?: string | null;
  telefone?: string | null;
  resgatar_premio?: boolean;
  totem?: string | null;
  itens: ItemNovoPedido[];
}

export interface ItemPedido {
  id: number;
  produto_id: number | null;
  nome: string;
  personalizacoes: { grupo: string; opcao: string }[];
  observacao: string | null;
  quantidade: number;
  preco_unitario: number;
  total: number;
}

export interface EtapaPedido extends Opcao<StatusPedido> {
  concluida: boolean;
}

export interface Acompanhamento {
  codigo: string;
  nome_cliente: string | null;
  status: Opcao<StatusPedido>;
  status_pagamento: Opcao<StatusPagamento>;
  forma_pagamento: Opcao<FormaPagamento>;
  consumo: Opcao<Consumo>;
  etapas: EtapaPedido[];
  subtotal: number;
  desconto: number;
  total: number;
  cupom: string | null;
  avaliacao: number | null;
  fidelidade: { selos: number; meta: number; resgate: boolean } | null;
  tempo_estimado_min: number;
  minutos_decorridos: number;
  itens: ItemPedido[];
  criado_em: string;
}

export interface ErroApi {
  message: string;
  errors?: Record<string, string[]>;
}

export interface Pedido {
  id: number;
  codigo: string;
  nome_cliente: string | null;
  status: Opcao<StatusPedido>;
  proximo_status: Opcao<StatusPedido> | null;
  status_pagamento: Opcao<StatusPagamento>;
  forma_pagamento: Opcao<FormaPagamento>;
  consumo: Opcao<Consumo>;
  subtotal: number;
  desconto: number;
  total: number;
  cupom: string | null;
  fidelidade: { resgate: boolean } | null;
  avaliacao: { nota: number; comentario: string | null; em: string | null } | null;
  tempo_estimado_min: number;
  minutos_decorridos: number;
  minutos_atraso: number;
  totem?: string | null;
  itens: ItemPedido[];
  criado_em: string;
  pago_em: string | null;
  pronto_em: string | null;
  finalizado_em: string | null;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  papel: Opcao;
  permissoes: string[];
  areas: string[];
  ativo: boolean;
}

/* ---------- Painel administrativo ---------- */

export interface CategoriaPainel {
  id: number;
  nome: string;
  descricao: string | null;
  icone: string | null;
  ordem: number;
  ativo: boolean;
  total_produtos?: number;
}

export interface ProdutoPainel extends Produto {
  categoria?: { id: number; nome: string } | null;
}

// a foto vai separada
export interface ProdutoForm {
  categoria_id: number | null;
  nome: string;
  descricao: string | null;
  preco: number;
  estoque: number;
  tempo_preparo_min: number;
  porcao: string | null;
  calorias: number | null;
  ingredientes: string | null;
  destaques: string[];
  tags: string[];
  alergenos: string[];
  personalizacoes: GrupoPersonalizacao[];
  destaque: boolean;
  ativo: boolean;
}

export interface TotalForma extends Opcao<FormaPagamento> {
  total: number;
  quantidade: number;
}

export interface VendaDia {
  data: string;
  total: number;
  quantidade: number;
}

export interface MaisVendido {
  nome: string;
  quantidade: number;
  total: number;
}

export interface Vendas {
  periodo: { inicio: string; fim: string };
  total: number;
  quantidade_pedidos: number;
  ticket_medio: number;
  por_forma: TotalForma[];
  por_dia: VendaDia[];
  mais_vendidos: MaisVendido[];
}

export interface Dashboard {
  hoje: { faturamento: number; pedidos: number; ticket_medio: number; por_forma: TotalForma[] };
  fila: { total: number; recebidos: number; em_preparo: number; prontos: number };
  semana: { total: number; por_dia: VendaDia[]; mais_vendidos: MaisVendido[] };
  operacao: {
    por_hora: { hora: number; pedidos: number }[];
    preparo: { pedidos: number; medio_min: number | null; previsto_min: number | null; no_prazo_pct: number | null };
  };
  avaliacoes: {
    media: number | null;
    quantidade: number;
    por_nota: { nota: number; quantidade: number }[];
    comentarios: { codigo: string; nome_cliente: string | null; nota: number; comentario: string; em: string }[];
  };
  atrasados: Pedido[];
  estoque_baixo: { limite: number; produtos: ProdutoPainel[] };
  recentes: Pedido[];
}

export interface Caixa {
  id: number;
  status: Opcao<'aberto' | 'fechado'>;
  saldo_inicial: number;
  saldo_final: number | null;
  aberto_em: string;
  fechado_em: string | null;
  aberto_por?: string | null;
  fechado_por?: string | null;
}

export interface ResumoCaixa {
  saldo_inicial: number;
  vendas_dinheiro: number;
  entradas: number;
  saidas: number;
  saldo_esperado: number;
}

export interface CaixaAtual {
  caixa: Caixa;
  resumo: ResumoCaixa;
}

export interface Movimento {
  id: number;
  caixa_id: number;
  tipo: Opcao<'entrada' | 'saida'>;
  descricao: string;
  forma_pagamento: Opcao<FormaPagamento>;
  valor: number;
  usuario?: string | null;
  criado_em: string;
}

export interface Configuracoes {
  nome_loja: string;
  frase_totem: string | null;
  logo_url: string | null;
  tempo_espera_min: number;
  estoque_baixo: number;
  fidelidade: RegrasFidelidade;
}

export interface Totem {
  id: number;
  codigo: string;
  localizacao: string;
  status: Opcao<'online' | 'offline' | 'manutencao'>;
  pedidos_hoje?: number;
}

export interface Paginado<T> {
  data: T[];
  meta: { current_page: number; last_page: number; total: number };
}

export interface FiltroPedidos {
  status: 'todos' | StatusPedido;
  busca: string;
  pagina: number;
}

export type TipoCupom = 'percentual' | 'valor';

// o que o totem recebe ao conferir um cupom
export interface CupomAplicado {
  codigo: string;
  descricao: string | null;
  tipo: TipoCupom;
  valor: number;
  pedido_minimo: number | null;
  desconto: number;
}

export interface Cupom {
  id: number;
  codigo: string;
  descricao: string | null;
  tipo: Opcao<TipoCupom>;
  valor: number;
  pedido_minimo: number | null;
  validade: string | null;
  limite_usos: number | null;
  usos: number;
  ativo: boolean;
}

export interface CupomForm {
  codigo: string;
  descricao: string | null;
  tipo: TipoCupom;
  valor: number;
  pedido_minimo: number | null;
  validade: string | null;
  limite_usos: number | null;
  ativo: boolean;
}
