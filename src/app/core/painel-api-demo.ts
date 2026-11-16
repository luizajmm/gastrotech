import { Injectable } from '@angular/core';
import { BehaviorSubject, defer, delay, Observable, of, throwError } from 'rxjs';
import { CARDAPIO_DEMO } from './dados-demo';
import {
  Acompanhamento,
  Caixa,
  CaixaAtual,
  Cardapio,
  CategoriaPainel,
  Configuracoes,
  Dashboard,
  FiltroPedidos,
  FormaPagamento,
  ItemPedido,
  Movimento,
  NovoPedido,
  Opcao,
  Paginado,
  Pedido,
  ProdutoForm,
  ProdutoPainel,
  StatusPedido,
  Totem,
  TotalForma,
  Usuario,
  VendaDia,
  Vendas,
} from './modelos';
import {
  CategoriaForm,
  FalhaFormulario,
  FiltroProdutos,
  MovimentoForm,
  PainelApi,
  TotemForm,
  UsuarioForm,
} from './painel-api';

const FORMAS: Record<FormaPagamento, string> = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };
const STATUS: Record<StatusPedido, string> = {
  recebido: 'Recebido',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  retirado: 'Retirado',
  cancelado: 'Cancelado',
};
const PAPEIS: Record<string, { rotulo: string; permissoes: string[] }> = {
  administrador: { rotulo: 'Administrador', permissoes: ['cardapio', 'pedidos', 'caixa', 'usuarios', 'configuracoes'] },
  cardapio: { rotulo: 'Cardápio', permissoes: ['cardapio'] },
  atendimento: { rotulo: 'Atendimento', permissoes: ['pedidos', 'caixa'] },
  leitura: { rotulo: 'Somente leitura', permissoes: [] },
};
const TOTEM_STATUS = { online: 'Online', offline: 'Offline', manutencao: 'Manutenção' } as const;
const CLIENTES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabi', 'Heitor', 'Iara', 'João', 'Larissa', 'Marcos'];

/** Números "aleatórios" sempre iguais, para a demonstração abrir com os mesmos dados. */
function sorteador(semente: number): () => number {
  return () => {
    semente |= 0;
    semente = (semente + 0x6d2b79f5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dia = (d: Date) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const centavos = (v: number) => Math.round(v * 100) / 100;

const ETAPAS: StatusPedido[] = ['recebido', 'em_preparo', 'pronto', 'retirado'];
const PROXIMO: Partial<Record<StatusPedido, StatusPedido>> = { recebido: 'em_preparo', em_preparo: 'pronto', pronto: 'retirado' };

/**
 * "Banco de dados" da demonstração: cardápio, pedidos, equipe, caixa e configurações
 * em memória (somem ao recarregar a página). É uma instância só para o app inteiro:
 * o pedido feito no totem aparece na cozinha e no painel, como no sistema de verdade.
 * Aplica as mesmas regras da API.
 */
@Injectable({ providedIn: 'root' })
export class PainelApiDemo extends PainelApi {
  private categoriasDb: CategoriaPainel[] = CARDAPIO_DEMO.categorias.map(({ produtos: _, ...c }) => ({ ...c }));
  private produtosDb: ProdutoPainel[] = CARDAPIO_DEMO.categorias.flatMap((c) =>
    c.produtos.map((p) => ({ ...structuredClone(p), categoria: { id: c.id, nome: c.nome } })),
  );
  private usuariosDb: Usuario[] = [
    this.usuario(1, 'Administrador', 'admin@gastrotech.com', 'administrador'),
    this.usuario(2, 'Equipe Cardápio', 'cardapio@gastrotech.com', 'cardapio'),
    this.usuario(3, 'Equipe Atendimento', 'atendimento@gastrotech.com', 'atendimento'),
    this.usuario(4, 'Consulta', 'leitura@gastrotech.com', 'leitura'),
  ];
  /** Senhas da equipe de demonstração (as mesmas da API: "gastrotech"). */
  private senhas = new Map<number, string>([1, 2, 3, 4].map((id) => [id, 'gastrotech']));
  private config: Configuracoes = {
    nome_loja: CARDAPIO_DEMO.loja.nome_loja,
    frase_totem: CARDAPIO_DEMO.loja.frase_totem,
    logo_url: CARDAPIO_DEMO.loja.logo_url,
    tempo_espera_min: CARDAPIO_DEMO.loja.tempo_espera_min,
    estoque_baixo: 10,
  };
  private totensDb: Totem[] = [
    { id: 1, codigo: 'TOTEM-01', localizacao: 'Entrada principal', status: { valor: 'online', rotulo: 'Online' } },
    { id: 2, codigo: 'TOTEM-02', localizacao: 'Balcão lateral', status: { valor: 'online', rotulo: 'Online' } },
    { id: 3, codigo: 'TOTEM-03', localizacao: 'Área externa', status: { valor: 'manutencao', rotulo: 'Manutenção' } },
  ];
  /** Todos os pedidos; a cozinha e o totem acompanham as mudanças por aqui. */
  readonly pedidos$ = new BehaviorSubject<Pedido[]>(this.gerarPedidos());

  private get pedidosDb(): Pedido[] {
    return this.pedidos$.value;
  }
  private caixas: Caixa[] = [];
  private movimentosDb: Movimento[] = [];
  private proximoId = 1000;

  constructor() {
    super();
    // Caixa de hoje aberto às 10h com dois movimentos
    const abertura = new Date();
    abertura.setHours(10, 0, 0, 0);
    this.caixas.push({
      id: 1,
      status: { valor: 'aberto', rotulo: 'Aberto' },
      saldo_inicial: 150,
      saldo_final: null,
      aberto_em: abertura.toISOString(),
      fechado_em: null,
      aberto_por: 'Administrador',
    });
    this.movimentosDb.push(
      this.movimento(1, 'entrada', 'Reforço de troco', 50, new Date(abertura.getTime() + 30 * 60_000)),
      this.movimento(2, 'saida', 'Compra de embalagens', 22.5, new Date(abertura.getTime() + 95 * 60_000)),
    );
  }

  /* ---------- Visão geral ---------- */

  dashboard(): Observable<Dashboard> {
    return this.responder(() => {
      const hoje = this.calcularVendas(dia(new Date()), dia(new Date()));
      const semanaInicio = new Date();
      semanaInicio.setDate(semanaInicio.getDate() - 6);
      const semana = this.calcularVendas(dia(semanaInicio), dia(new Date()));
      const ativos = this.pedidosDb.filter((p) => ['recebido', 'em_preparo', 'pronto'].includes(p.status.valor));
      const agora = Date.now();

      return {
        hoje: {
          faturamento: hoje.total,
          pedidos: this.pedidosDb.filter((p) => dia(new Date(p.criado_em)) === dia(new Date()) && p.status.valor !== 'cancelado').length,
          ticket_medio: hoje.ticket_medio,
          por_forma: hoje.por_forma,
        },
        fila: {
          total: ativos.length,
          recebidos: ativos.filter((p) => p.status.valor === 'recebido').length,
          em_preparo: ativos.filter((p) => p.status.valor === 'em_preparo').length,
          prontos: ativos.filter((p) => p.status.valor === 'pronto').length,
        },
        semana: { total: semana.total, por_dia: semana.por_dia, mais_vendidos: semana.mais_vendidos },
        atrasados: ativos
          .filter((p) => p.status.valor !== 'pronto' && (agora - Date.parse(p.criado_em)) / 60_000 > p.tempo_estimado_min)
          .slice(0, 5),
        estoque_baixo: {
          limite: this.config.estoque_baixo,
          produtos: this.produtosDb
            .filter((p) => p.estoque <= this.config.estoque_baixo)
            .sort((a, b) => a.estoque - b.estoque)
            .slice(0, 6),
        },
        recentes: [...this.pedidosDb].sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em)).slice(0, 6),
      };
    });
  }

  pedidos(filtro: FiltroPedidos): Observable<Paginado<Pedido>> {
    return this.responder(() => {
      const termo = filtro.busca.trim().toLowerCase();
      const lista = [...this.pedidosDb]
        .filter((p) => filtro.status === 'todos' || p.status.valor === filtro.status)
        .filter((p) => !termo || p.codigo.toLowerCase() === termo || (p.nome_cliente ?? '').toLowerCase().includes(termo))
        .sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em));
      const porPagina = 15;
      const ultima = Math.max(1, Math.ceil(lista.length / porPagina));
      const pagina = Math.min(Math.max(1, filtro.pagina), ultima);
      return {
        data: lista.slice((pagina - 1) * porPagina, pagina * porPagina),
        meta: { current_page: pagina, last_page: ultima, total: lista.length },
      };
    });
  }

  /* ---------- Cardápio ---------- */

  categorias(): Observable<CategoriaPainel[]> {
    return this.responder(() =>
      [...this.categoriasDb]
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
        .map((c) => ({ ...c, total_produtos: this.produtosDb.filter((p) => p.categoria_id === c.id).length })),
    );
  }

  salvarCategoria(dados: CategoriaForm, id?: number): Observable<CategoriaPainel> {
    return this.responder(() => {
      if (!dados.nome.trim()) throw new FalhaFormulario('O nome é obrigatório.', { nome: 'O nome é obrigatório.' });
      const categoria: CategoriaPainel = { id: id ?? this.novoId(), ...dados, nome: dados.nome.trim() };
      this.categoriasDb = id ? this.categoriasDb.map((c) => (c.id === id ? categoria : c)) : [...this.categoriasDb, categoria];
      this.produtosDb = this.produtosDb.map((p) =>
        p.categoria_id === categoria.id ? { ...p, categoria: { id: categoria.id, nome: categoria.nome } } : p,
      );
      return { ...categoria, total_produtos: this.produtosDb.filter((p) => p.categoria_id === categoria.id).length };
    });
  }

  excluirCategoria(id: number): Observable<void> {
    return this.responder(() => {
      this.categoriasDb = this.categoriasDb.filter((c) => c.id !== id);
      // Igual à API: os produtos ficam sem categoria
      this.produtosDb = this.produtosDb.map((p) => (p.categoria_id === id ? { ...p, categoria_id: null, categoria: null } : p));
    });
  }

  produtos(filtro: FiltroProdutos): Observable<ProdutoPainel[]> {
    return this.responder(() => {
      const termo = filtro.busca.trim().toLowerCase();
      return this.produtosDb
        .filter((p) => !termo || p.nome.toLowerCase().includes(termo) || (p.descricao ?? '').toLowerCase().includes(termo))
        .filter((p) => !filtro.categoria_id || p.categoria_id === filtro.categoria_id)
        .filter((p) => filtro.situacao !== 'ativos' || p.ativo)
        .filter((p) => filtro.situacao !== 'inativos' || !p.ativo)
        .filter((p) => filtro.situacao !== 'estoque_baixo' || p.estoque <= this.config.estoque_baixo)
        .sort((a, b) => a.nome.localeCompare(b.nome));
    });
  }

  salvarProduto(dados: ProdutoForm, id?: number): Observable<ProdutoPainel> {
    return this.responder(() => {
      const campos: Record<string, string> = {};
      if (!dados.nome.trim()) campos['nome'] = 'O nome é obrigatório.';
      if (!(dados.preco >= 0)) campos['preco'] = 'Informe um preço válido.';
      dados.personalizacoes.forEach((g, i) => {
        if (!g.nome.trim()) campos[`personalizacoes.${i}.nome`] = 'Dê um nome ao grupo.';
        if (g.opcoes.length < 2) campos[`personalizacoes.${i}.opcoes`] = 'Cada personalização precisa de pelo menos 2 opções.';
      });
      if (Object.keys(campos).length) throw new FalhaFormulario(Object.values(campos)[0], campos);

      const anterior = this.produtosDb.find((p) => p.id === id);
      const categoria = this.categoriasDb.find((c) => c.id === dados.categoria_id);
      const produto: ProdutoPainel = {
        id: id ?? this.novoId(),
        imagem_url: anterior?.imagem_url ?? null,
        ...dados,
        nome: dados.nome.trim(),
        categoria: categoria ? { id: categoria.id, nome: categoria.nome } : null,
      };
      this.produtosDb = id ? this.produtosDb.map((p) => (p.id === id ? produto : p)) : [...this.produtosDb, produto];
      return produto;
    });
  }

  excluirProduto(id: number): Observable<void> {
    return this.responder(() => {
      this.produtosDb = this.produtosDb.filter((p) => p.id !== id);
    });
  }

  enviarImagem(id: number, arquivo: File): Observable<ProdutoPainel> {
    return defer(async () => {
      this.validarImagem(arquivo);
      const url = await lerComoUrl(arquivo);
      return this.atualizarProduto(id, { imagem_url: url });
    }).pipe(delay(300));
  }

  removerImagem(id: number): Observable<ProdutoPainel> {
    return this.responder(() => this.atualizarProduto(id, { imagem_url: null }));
  }

  /* ---------- Financeiro ---------- */

  vendas(inicio: string, fim: string): Observable<Vendas> {
    return this.responder(() => {
      if (fim < inicio) {
        throw new FalhaFormulario('A data final precisa ser igual ou depois da inicial.', {
          data_fim: 'A data final precisa ser igual ou depois da inicial.',
        });
      }
      return this.calcularVendas(inicio, fim);
    });
  }

  caixa(): Observable<CaixaAtual | null> {
    return this.responder(() => {
      const aberto = this.caixas.find((c) => c.status.valor === 'aberto');
      return aberto ? { caixa: aberto, resumo: this.resumo(aberto) } : null;
    });
  }

  abrirCaixa(saldoInicial: number): Observable<CaixaAtual> {
    return this.responder(() => {
      if (this.caixas.some((c) => c.status.valor === 'aberto')) {
        throw new FalhaFormulario('Já existe um caixa aberto. Feche-o antes de abrir outro.');
      }
      if (!(saldoInicial >= 0)) {
        throw new FalhaFormulario('Informe o valor que está na gaveta.', { saldo_inicial: 'Informe o valor que está na gaveta.' });
      }
      const caixa: Caixa = {
        id: this.novoId(),
        status: { valor: 'aberto', rotulo: 'Aberto' },
        saldo_inicial: saldoInicial,
        saldo_final: null,
        aberto_em: new Date().toISOString(),
        fechado_em: null,
        aberto_por: 'Administrador',
      };
      this.caixas.unshift(caixa);
      return { caixa, resumo: this.resumo(caixa) };
    });
  }

  fecharCaixa(): Observable<CaixaAtual> {
    return this.responder(() => {
      const aberto = this.caixas.find((c) => c.status.valor === 'aberto');
      if (!aberto) throw new FalhaFormulario('Não há caixa aberto.');
      const resumo = this.resumo(aberto);
      const fechado: Caixa = {
        ...aberto,
        status: { valor: 'fechado', rotulo: 'Fechado' },
        saldo_final: resumo.saldo_esperado,
        fechado_em: new Date().toISOString(),
        fechado_por: 'Administrador',
      };
      this.caixas = this.caixas.map((c) => (c.id === aberto.id ? fechado : c));
      return { caixa: fechado, resumo };
    });
  }

  historicoCaixas(): Observable<Caixa[]> {
    return this.responder(() => [...this.caixas]);
  }

  movimentos(): Observable<Movimento[]> {
    return this.responder(() => {
      const aberto = this.caixas.find((c) => c.status.valor === 'aberto');
      return aberto
        ? this.movimentosDb.filter((m) => m.caixa_id === aberto.id).sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em))
        : [];
    });
  }

  registrarMovimento(dados: MovimentoForm): Observable<Movimento> {
    return this.responder(() => {
      const aberto = this.caixas.find((c) => c.status.valor === 'aberto');
      if (!aberto) throw new FalhaFormulario('Abra o caixa antes de registrar movimentos.');
      const campos: Record<string, string> = {};
      if (!dados.descricao.trim()) campos['descricao'] = 'Descreva o movimento.';
      if (!(dados.valor > 0)) campos['valor'] = 'O valor precisa ser maior que zero.';
      if (Object.keys(campos).length) throw new FalhaFormulario(Object.values(campos)[0], campos);

      const movimento = { ...this.movimento(this.novoId(), dados.tipo, dados.descricao.trim(), dados.valor, new Date()), caixa_id: aberto.id };
      this.movimentosDb.push(movimento);
      return movimento;
    });
  }

  /* ---------- Equipe ---------- */

  usuarios(): Observable<Usuario[]> {
    return this.responder(() => [...this.usuariosDb].sort((a, b) => a.nome.localeCompare(b.nome)));
  }

  salvarUsuario(dados: UsuarioForm, id?: number): Observable<Usuario> {
    return this.responder(() => {
      const email = dados.email.trim().toLowerCase();
      const campos: Record<string, string> = {};
      if (!dados.nome.trim()) campos['nome'] = 'O nome é obrigatório.';
      if (!/^\S+@\S+\.\S+$/.test(email)) campos['email'] = 'Informe um e-mail válido.';
      else if (this.usuariosDb.some((u) => u.email === email && u.id !== id)) campos['email'] = 'Este e-mail já está em uso.';
      if (!id && dados.senha.length < 6) campos['senha'] = 'A senha precisa ter pelo menos 6 caracteres.';
      if (id && dados.senha && dados.senha.length < 6) campos['senha'] = 'A senha precisa ter pelo menos 6 caracteres.';

      const eraAdmin = this.usuariosDb.find((u) => u.id === id)?.papel.valor === 'administrador';
      const deixaDeSerAdmin = eraAdmin && (dados.papel !== 'administrador' || !dados.ativo);
      const outrosAdmins = this.usuariosDb.filter((u) => u.id !== id && u.ativo && u.papel.valor === 'administrador').length;
      if (deixaDeSerAdmin && !outrosAdmins) campos['papel'] = 'O sistema precisa de pelo menos um administrador ativo.';
      if (Object.keys(campos).length) throw new FalhaFormulario(Object.values(campos)[0], campos);

      const usuario = this.usuario(id ?? this.novoId(), dados.nome.trim(), email, dados.papel, dados.ativo);
      this.usuariosDb = id ? this.usuariosDb.map((u) => (u.id === id ? usuario : u)) : [...this.usuariosDb, usuario];
      if (dados.senha) this.senhas.set(usuario.id, dados.senha);
      return usuario;
    });
  }

  excluirUsuario(id: number): Observable<void> {
    return this.responder(() => {
      const alvo = this.usuariosDb.find((u) => u.id === id);
      const outrosAdmins = this.usuariosDb.filter((u) => u.id !== id && u.ativo && u.papel.valor === 'administrador').length;
      if (alvo?.papel.valor === 'administrador' && !outrosAdmins) {
        throw new FalhaFormulario('O sistema precisa de pelo menos um administrador ativo.');
      }
      this.usuariosDb = this.usuariosDb.filter((u) => u.id !== id);
      this.senhas.delete(id);
    });
  }

  /** Login da demonstração: confere e-mail e senha na equipe em memória. */
  autenticar(email: string, senha: string): Usuario {
    const usuario = this.usuariosDb.find((u) => u.email === email.trim().toLowerCase());
    if (!usuario || this.senhas.get(usuario.id) !== senha) throw new Error('E-mail ou senha incorretos.');
    if (!usuario.ativo) throw new Error('Este acesso está desativado. Fale com o administrador.');
    return usuario;
  }

  /* ---------- Configurações ---------- */

  configuracoes(): Observable<Configuracoes> {
    return this.responder(() => ({ ...this.config }));
  }

  salvarConfiguracoes(dados: Partial<Configuracoes>): Observable<Configuracoes> {
    return this.responder(() => {
      const campos: Record<string, string> = {};
      if (dados.nome_loja !== undefined && !dados.nome_loja.trim()) campos['nome_loja'] = 'O nome da loja é obrigatório.';
      if (dados.tempo_espera_min !== undefined && !(dados.tempo_espera_min >= 1)) campos['tempo_espera_min'] = 'Informe pelo menos 1 minuto.';
      if (dados.estoque_baixo !== undefined && !(dados.estoque_baixo >= 0)) campos['estoque_baixo'] = 'Informe um número igual ou maior que zero.';
      if (Object.keys(campos).length) throw new FalhaFormulario(Object.values(campos)[0], campos);
      this.config = { ...this.config, ...dados };
      return { ...this.config };
    });
  }

  enviarLogo(arquivo: File): Observable<Configuracoes> {
    return defer(async () => {
      this.validarImagem(arquivo);
      this.config = { ...this.config, logo_url: await lerComoUrl(arquivo) };
      return { ...this.config };
    }).pipe(delay(300));
  }

  totens(): Observable<Totem[]> {
    return this.responder(() =>
      this.totensDb.map((t) => ({
        ...t,
        pedidos_hoje: this.pedidosDb.filter((p) => p.totem === t.codigo && dia(new Date(p.criado_em)) === dia(new Date())).length,
      })),
    );
  }

  salvarTotem(dados: TotemForm, id?: number): Observable<Totem> {
    return this.responder(() => {
      const codigo = dados.codigo.trim().toUpperCase();
      const campos: Record<string, string> = {};
      if (!codigo) campos['codigo'] = 'O código é obrigatório.';
      else if (this.totensDb.some((t) => t.codigo === codigo && t.id !== id)) campos['codigo'] = 'Já existe um totem com esse código.';
      if (!dados.localizacao.trim()) campos['localizacao'] = 'Diga onde o totem fica.';
      if (Object.keys(campos).length) throw new FalhaFormulario(Object.values(campos)[0], campos);

      const totem: Totem = {
        id: id ?? this.novoId(),
        codigo,
        localizacao: dados.localizacao.trim(),
        status: { valor: dados.status, rotulo: TOTEM_STATUS[dados.status] },
      };
      this.totensDb = id ? this.totensDb.map((t) => (t.id === id ? totem : t)) : [...this.totensDb, totem];
      return totem;
    });
  }

  excluirTotem(id: number): Observable<void> {
    return this.responder(() => {
      this.totensDb = this.totensDb.filter((t) => t.id !== id);
    });
  }

  /* ---------- Totem e cozinha (demonstração integrada) ---------- */

  /** Cardápio do totem: categorias visíveis com produtos à venda e com estoque. */
  cardapioTotem(): Cardapio {
    return {
      loja: {
        nome_loja: this.config.nome_loja,
        frase_totem: this.config.frase_totem,
        logo_url: this.config.logo_url,
        tempo_espera_min: this.config.tempo_espera_min,
      },
      categorias: [...this.categoriasDb]
        .filter((c) => c.ativo)
        .sort((a, b) => a.ordem - b.ordem)
        .map((c) => ({
          ...c,
          produtos: this.produtosDb
            .filter((p) => p.categoria_id === c.id && p.ativo && p.estoque > 0)
            .sort((a, b) => Number(b.destaque) - Number(a.destaque) || a.nome.localeCompare(b.nome))
            .map(({ categoria: _, ...p }) => structuredClone(p)),
        }))
        .filter((c) => c.produtos.length),
    };
  }

  /** Mesmas regras do PedidoService: preço e estoque do "banco", escolhas obrigatórias. */
  criarPedidoTotem(novo: NovoPedido): Pedido {
    if (!novo.itens.length) throw new FalhaFormulario('Adicione pelo menos um item ao pedido.');

    const reservado = new Map<number, number>();
    for (const item of novo.itens) {
      const produto = this.produtosDb.find((p) => p.id === item.produto_id);
      if (!produto || !produto.ativo) throw new FalhaFormulario('Um dos produtos não está mais disponível.');
      const total = (reservado.get(produto.id) ?? 0) + item.quantidade;
      reservado.set(produto.id, total);
      if (total > produto.estoque) throw new FalhaFormulario(`Só restam ${produto.estoque} unidade(s) de ${produto.nome}.`);
      for (const grupo of produto.personalizacoes) {
        if (grupo.obrigatorio && !item.personalizacoes?.[grupo.nome]) {
          throw new FalhaFormulario(`Escolha "${grupo.nome}" para ${produto.nome}.`);
        }
      }
    }

    const id = Math.max(0, ...this.pedidosDb.map((p) => p.id)) + 1;
    const agora = new Date().toISOString();
    const pago = novo.forma_pagamento !== 'dinheiro';
    const itens: ItemPedido[] = novo.itens.map((item, i) => {
      const produto = this.produtosDb.find((p) => p.id === item.produto_id)!;
      return {
        id: id * 10 + i,
        produto_id: produto.id,
        nome: produto.nome,
        personalizacoes: Object.entries(item.personalizacoes ?? {}).map(([grupo, opcao]) => ({ grupo, opcao })),
        observacao: item.observacao?.trim() || null,
        quantidade: item.quantidade,
        preco_unitario: produto.preco,
        total: centavos(produto.preco * item.quantidade),
      };
    });

    // Baixa no estoque
    this.produtosDb = this.produtosDb.map((p) => (reservado.has(p.id) ? { ...p, estoque: p.estoque - reservado.get(p.id)! } : p));

    const pedido: Pedido = {
      id,
      codigo: `A${100 + id}`,
      nome_cliente: novo.nome_cliente?.trim() || 'Cliente',
      status: { valor: 'recebido', rotulo: STATUS.recebido },
      proximo_status: { valor: 'em_preparo', rotulo: STATUS.em_preparo },
      status_pagamento: pago ? { valor: 'pago', rotulo: 'Pago' } : { valor: 'pendente', rotulo: 'Pendente' },
      forma_pagamento: { valor: novo.forma_pagamento, rotulo: FORMAS[novo.forma_pagamento] },
      subtotal: centavos(itens.reduce((s, i) => s + i.total, 0)),
      tempo_estimado_min: Math.max(
        ...novo.itens.map((i) => this.produtosDb.find((p) => p.id === i.produto_id)!.tempo_preparo_min),
      ),
      minutos_decorridos: 0,
      minutos_atraso: 0,
      totem: 'TOTEM-01',
      itens,
      criado_em: agora,
      pago_em: pago ? agora : null,
      pronto_em: null,
      finalizado_em: null,
    };

    this.pedidos$.next([...this.pedidosDb, pedido]);
    return pedido;
  }

  avancarPedido(id: number): Pedido {
    return this.mudarPedido(id, (p) => {
      const proximo = PROXIMO[p.status.valor];
      if (!proximo) throw new FalhaFormulario('Este pedido já foi encerrado.');
      if (proximo === 'retirado' && p.status_pagamento.valor !== 'pago') {
        throw new FalhaFormulario('Confirme o pagamento antes de entregar o pedido.');
      }
      const agora = new Date().toISOString();
      const depois = PROXIMO[proximo];
      return {
        ...p,
        status: { valor: proximo, rotulo: STATUS[proximo] },
        proximo_status: depois ? { valor: depois, rotulo: STATUS[depois] } : null,
        pronto_em: proximo === 'pronto' ? agora : p.pronto_em,
        finalizado_em: proximo === 'retirado' ? agora : null,
      };
    });
  }

  cancelarPedido(id: number): Pedido {
    return this.mudarPedido(id, (p) => {
      if (['retirado', 'cancelado'].includes(p.status.valor)) throw new FalhaFormulario('Este pedido já foi encerrado.');
      // Devolve ao estoque
      for (const item of p.itens) {
        this.produtosDb = this.produtosDb.map((prod) =>
          prod.id === item.produto_id ? { ...prod, estoque: prod.estoque + item.quantidade } : prod,
        );
      }
      return {
        ...p,
        status: { valor: 'cancelado', rotulo: STATUS.cancelado },
        proximo_status: null,
        status_pagamento: p.status_pagamento.valor === 'pago' ? { valor: 'estornado', rotulo: 'Estornado' } : p.status_pagamento,
        finalizado_em: new Date().toISOString(),
      };
    });
  }

  confirmarPagamentoPedido(id: number): Pedido {
    return this.mudarPedido(id, (p) => {
      if (p.status.valor === 'cancelado') throw new FalhaFormulario('Pedido cancelado não pode ser pago.');
      return p.status_pagamento.valor === 'pago'
        ? p
        : { ...p, status_pagamento: { valor: 'pago', rotulo: 'Pago' }, pago_em: new Date().toISOString() };
    });
  }

  /** Pedido no formato da tela de acompanhamento do cliente. */
  acompanhamento(pedido: Pedido): Acompanhamento {
    const atual = ETAPAS.indexOf(pedido.status.valor);
    return {
      codigo: pedido.codigo,
      nome_cliente: pedido.nome_cliente,
      status: pedido.status,
      status_pagamento: pedido.status_pagamento,
      forma_pagamento: pedido.forma_pagamento,
      etapas: ETAPAS.map((e, i) => ({ valor: e, rotulo: STATUS[e], concluida: atual >= 0 && i <= atual })),
      subtotal: pedido.subtotal,
      tempo_estimado_min: pedido.tempo_estimado_min,
      minutos_decorridos: Math.max(0, Math.floor((Date.now() - Date.parse(pedido.criado_em)) / 60_000)),
      itens: pedido.itens,
      criado_em: pedido.criado_em,
    };
  }

  private mudarPedido(id: number, mudanca: (p: Pedido) => Pedido): Pedido {
    const atual = this.pedidosDb.find((p) => p.id === id);
    if (!atual) throw new FalhaFormulario('Pedido não encontrado.');
    const novo = mudanca(atual);
    this.pedidos$.next(this.pedidosDb.map((p) => (p.id === id ? novo : p)));
    return novo;
  }

  /* ---------- Auxiliares ---------- */

  /** Executa a regra e devolve como se fosse a resposta da API (com um pequeno atraso). */
  private responder<T>(regra: () => T): Observable<T> {
    return defer(() => {
      try {
        return of(regra());
      } catch (e) {
        return throwError(() => e);
      }
    }).pipe(delay(200));
  }

  private novoId(): number {
    return this.proximoId++;
  }

  private atualizarProduto(id: number, mudanca: Partial<ProdutoPainel>): ProdutoPainel {
    const atual = this.produtosDb.find((p) => p.id === id);
    if (!atual) throw new FalhaFormulario('Produto não encontrado.');
    const novo = { ...atual, ...mudanca };
    this.produtosDb = this.produtosDb.map((p) => (p.id === id ? novo : p));
    return novo;
  }

  private validarImagem(arquivo: File): void {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
      throw new FalhaFormulario('Envie uma imagem JPG, PNG ou WebP.', { imagem: 'Envie uma imagem JPG, PNG ou WebP.' });
    }
    if (arquivo.size > 4 * 1024 * 1024) {
      throw new FalhaFormulario('A imagem pode ter no máximo 4 MB.', { imagem: 'A imagem pode ter no máximo 4 MB.' });
    }
  }

  private usuario(id: number, nome: string, email: string, papel: string, ativo = true): Usuario {
    return {
      id,
      nome,
      email,
      papel: { valor: papel, rotulo: PAPEIS[papel].rotulo },
      permissoes: ativo ? PAPEIS[papel].permissoes : [],
      ativo,
    };
  }

  private movimento(id: number, tipo: 'entrada' | 'saida', descricao: string, valor: number, quando: Date): Movimento {
    return {
      id,
      caixa_id: 1,
      tipo: { valor: tipo, rotulo: tipo === 'entrada' ? 'Entrada' : 'Saída' },
      descricao,
      forma_pagamento: { valor: 'dinheiro', rotulo: 'Dinheiro' },
      valor,
      usuario: 'Administrador',
      criado_em: quando.toISOString(),
    };
  }

  private resumo(caixa: Caixa) {
    const ate = caixa.fechado_em ? Date.parse(caixa.fechado_em) : Date.now();
    const vendasDinheiro = this.pedidosDb
      .filter((p) => p.status_pagamento.valor === 'pago' && p.forma_pagamento.valor === 'dinheiro' && p.pago_em)
      .filter((p) => Date.parse(p.pago_em!) >= Date.parse(caixa.aberto_em) && Date.parse(p.pago_em!) <= ate)
      .reduce((s, p) => s + p.subtotal, 0);
    const movs = this.movimentosDb.filter((m) => m.caixa_id === caixa.id);
    const entradas = movs.filter((m) => m.tipo.valor === 'entrada').reduce((s, m) => s + m.valor, 0);
    const saidas = movs.filter((m) => m.tipo.valor === 'saida').reduce((s, m) => s + m.valor, 0);
    return {
      saldo_inicial: caixa.saldo_inicial,
      vendas_dinheiro: centavos(vendasDinheiro),
      entradas: centavos(entradas),
      saidas: centavos(saidas),
      saldo_esperado: centavos(caixa.saldo_inicial + vendasDinheiro + entradas - saidas),
    };
  }

  /** Mesmo cálculo do FinanceiroService da API: só pedidos pagos, pela data do pagamento. */
  private calcularVendas(inicio: string, fim: string): Vendas {
    const pagos = this.pedidosDb.filter((p) => {
      if (p.status_pagamento.valor !== 'pago' || !p.pago_em) return false;
      const d = dia(new Date(p.pago_em));
      return d >= inicio && d <= fim;
    });

    const total = centavos(pagos.reduce((s, p) => s + p.subtotal, 0));
    const por_forma: TotalForma[] = (Object.keys(FORMAS) as FormaPagamento[]).map((f) => {
      const daForma = pagos.filter((p) => p.forma_pagamento.valor === f);
      return {
        valor: f,
        rotulo: FORMAS[f],
        total: centavos(daForma.reduce((s, p) => s + p.subtotal, 0)),
        quantidade: daForma.length,
      };
    });

    const por_dia: VendaDia[] = [];
    for (let d = new Date(`${inicio}T12:00:00`); dia(d) <= fim; d.setDate(d.getDate() + 1)) {
      const doDia = pagos.filter((p) => dia(new Date(p.pago_em!)) === dia(d));
      por_dia.push({ data: dia(d), total: centavos(doDia.reduce((s, p) => s + p.subtotal, 0)), quantidade: doDia.length });
    }

    const itens = new Map<string, { quantidade: number; total: number }>();
    for (const item of pagos.flatMap((p) => p.itens)) {
      const atual = itens.get(item.nome) ?? { quantidade: 0, total: 0 };
      itens.set(item.nome, { quantidade: atual.quantidade + item.quantidade, total: atual.total + item.total });
    }

    return {
      periodo: { inicio, fim },
      total,
      quantidade_pedidos: pagos.length,
      ticket_medio: pagos.length ? centavos(total / pagos.length) : 0,
      por_forma,
      por_dia,
      mais_vendidos: [...itens.entries()]
        .map(([nome, v]) => ({ nome, quantidade: v.quantidade, total: centavos(v.total) }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5),
    };
  }

  /** Uma semana de vendas + a fila de hoje (mesma ideia do PedidosDemonstracaoSeeder). */
  private gerarPedidos(): Pedido[] {
    const aleatorio = sorteador(2026);
    const produtos = this.produtosDb;
    const pedidos: Pedido[] = [];
    let id = 1;

    const criar = (quando: Date, status: StatusPedido, forma?: FormaPagamento) => {
      const formaPedido = forma ?? (['pix', 'cartao', 'dinheiro'] as FormaPagamento[])[Math.floor(aleatorio() * 3)];
      const pago = formaPedido !== 'dinheiro' || status === 'retirado';
      const escolhidos = [...produtos].sort(() => aleatorio() - 0.5).slice(0, 1 + Math.floor(aleatorio() * 3));
      const itens: ItemPedido[] = escolhidos.map((p, i) => {
        const quantidade = 1 + Math.floor(aleatorio() * 2);
        return {
          id: id * 10 + i,
          produto_id: p.id,
          nome: p.nome,
          personalizacoes: p.personalizacoes.map((g) => ({ grupo: g.nome, opcao: g.opcoes[Math.floor(aleatorio() * g.opcoes.length)] })),
          observacao: null,
          quantidade,
          preco_unitario: p.preco,
          total: centavos(p.preco * quantidade),
        };
      });
      const tempo = Math.max(...escolhidos.map((p) => p.tempo_preparo_min));
      const statusOpcao: Opcao<StatusPedido> = { valor: status, rotulo: STATUS[status] };
      pedidos.push({
        id,
        codigo: `A${100 + id}`,
        nome_cliente: CLIENTES[Math.floor(aleatorio() * CLIENTES.length)],
        status: statusOpcao,
        proximo_status: null,
        status_pagamento: pago ? { valor: 'pago', rotulo: 'Pago' } : { valor: 'pendente', rotulo: 'Pendente' },
        forma_pagamento: { valor: formaPedido, rotulo: FORMAS[formaPedido] },
        subtotal: centavos(itens.reduce((s, i) => s + i.total, 0)),
        tempo_estimado_min: tempo,
        minutos_decorridos: 0,
        minutos_atraso: 0,
        totem: aleatorio() < 0.55 ? 'TOTEM-01' : 'TOTEM-02',
        itens,
        criado_em: quando.toISOString(),
        pago_em: pago ? quando.toISOString() : null,
        pronto_em: ['pronto', 'retirado'].includes(status) ? new Date(quando.getTime() + 15 * 60_000).toISOString() : null,
        finalizado_em: status === 'retirado' ? new Date(quando.getTime() + 20 * 60_000).toISOString() : null,
      });
      id++;
    };

    for (let diasAtras = 7; diasAtras >= 1; diasAtras--) {
      // Mais movimento no fim de semana
      const data = new Date();
      data.setDate(data.getDate() - diasAtras);
      const fimDeSemana = [0, 5, 6].includes(data.getDay());
      const quantidade = (fimDeSemana ? 15 : 9) + Math.floor(aleatorio() * 6);
      for (let i = 0; i < quantidade; i++) {
        const quando = new Date(data);
        quando.setHours(11 + Math.floor(aleatorio() * 11), Math.floor(aleatorio() * 60), 0, 0);
        criar(quando, aleatorio() < 0.04 ? 'cancelado' : 'retirado');
      }
    }

    const minutos = (m: number) => new Date(Date.now() - m * 60_000);
    // Fila atual da cozinha
    for (let i = 0; i < 6; i++) criar(minutos(90 + i * 25), 'retirado');
    criar(minutos(32), 'em_preparo');
    criar(minutos(12), 'em_preparo');
    criar(minutos(6), 'pronto');
    criar(minutos(3), 'recebido');
    criar(minutos(1), 'recebido', 'dinheiro');

    // Algumas observações na fila, como o cliente escreveria no totem
    const observacoes = ['Sem cebola', 'Molho à parte'];
    const fila = pedidos.filter((p) => ['recebido', 'em_preparo'].includes(p.status.valor));
    fila.slice(-2).forEach((p, i) => (p.itens[0] = { ...p.itens[0], observacao: observacoes[i] }));

    // Cancelados devolvem o dinheiro: não contam como pagos
    return pedidos.map((p) => {
      const proximo = PROXIMO[p.status.valor];
      const comProximo = { ...p, proximo_status: proximo ? { valor: proximo, rotulo: STATUS[proximo] } : null };
      return p.status.valor === 'cancelado'
        ? { ...comProximo, status_pagamento: { valor: 'estornado' as const, rotulo: 'Estornado' } }
        : comProximo;
    });
  }
}

function lerComoUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new FalhaFormulario('Não foi possível ler a imagem.'));
    leitor.readAsDataURL(arquivo);
  });
}
