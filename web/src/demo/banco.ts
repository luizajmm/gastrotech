import { Injectable } from '@angular/core';
import { BehaviorSubject, defer, delay, Observable, of, throwError } from 'rxjs';
import { CARDAPIO_DEMO } from './dados';
import {
  Acompanhamento,
  Caixa,
  CaixaAtual,
  Cardapio,
  CategoriaPainel,
  ClientesFidelidade,
  Configuracoes,
  ConsultaFidelidade,
  Consumo,
  Cupom,
  CupomAplicado,
  CupomForm,
  Dashboard,
  Insumo,
  InsumoForm,
  ItemFicha,
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
} from '../app/core/modelos';
import {
  CategoriaForm,
  FalhaFormulario,
  FiltroProdutos,
  MovimentoForm,
  TotemForm,
  UsuarioForm,
} from '../app/core/painel-api';

const FORMAS: Record<FormaPagamento, string> = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' };
const STATUS: Record<StatusPedido, string> = {
  recebido: 'Recebido',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  retirado: 'Retirado',
  cancelado: 'Cancelado',
};
// igual ao Papel.php da api
const PAPEIS: Record<string, { rotulo: string; permissoes: string[]; areas: string[] }> = {
  administrador: { rotulo: 'Administrador', permissoes: ['cardapio', 'pedidos', 'caixa', 'usuarios', 'configuracoes'], areas: ['cardapio', 'pedidos', 'caixa', 'usuarios', 'configuracoes'] },
  cardapio: { rotulo: 'Cardápio', permissoes: ['cardapio'], areas: ['cardapio'] },
  atendimento: { rotulo: 'Atendimento', permissoes: ['pedidos', 'caixa'], areas: ['pedidos', 'caixa'] },
  leitura: { rotulo: 'Somente leitura', permissoes: [], areas: ['cardapio', 'pedidos', 'caixa', 'configuracoes'] },
};
const TOTEM_STATUS = { online: 'Online', offline: 'Offline', manutencao: 'Manutenção' } as const;
const CLIENTES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabi', 'Heitor', 'Iara', 'João', 'Larissa', 'Marcos'];

// números "aleatórios" sempre iguais, para a demonstração abrir com os mesmos dados
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

const CONSUMO: Record<Consumo, string> = { local: 'Comer aqui', viagem: 'Para levar' };
const COMENTARIOS: Record<number, string[]> = {
  5: ['Lanche chegou quentinho, perfeito!', 'Melhor smash da região.', 'Rápido e muito bom.', 'A batata suprema é sensacional.'],
  4: ['Muito bom, só demorou um pouquinho.', 'Gostei, voltaria.', 'Bom, mas podia ter mais molho.'],
  3: ['Ok, nada demais.', 'A batata veio meio murcha.'],
  2: ['Demorou bastante pra ficar pronto.', 'Veio sem o molho que eu pedi.'],
};
// movimento concentrado no almoço e na janta
const HORARIOS = [11, 12, 12, 12, 13, 13, 14, 15, 16, 17, 18, 19, 19, 19, 20, 20, 21];

const ETAPAS: StatusPedido[] = ['recebido', 'em_preparo', 'pronto', 'retirado'];
const PROXIMO: Partial<Record<StatusPedido, StatusPedido>> = { recebido: 'em_preparo', em_preparo: 'pronto', pronto: 'retirado' };

// "banco" da demonstração, fica em memória e some quando recarrega a página
@Injectable({ providedIn: 'root' })
export class BancoDemo {
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
  private senhas = new Map<number, string>([1, 2, 3, 4].map((id) => [id, 'gastrotech']));
  private config: Configuracoes = {
    nome_loja: CARDAPIO_DEMO.loja.nome_loja,
    frase_totem: CARDAPIO_DEMO.loja.frase_totem,
    logo_url: CARDAPIO_DEMO.loja.logo_url,
    tempo_espera_min: CARDAPIO_DEMO.loja.tempo_espera_min,
    estoque_baixo: 10,
    fidelidade: { ativa: true, meta: 10, premio: 15 },
  };
  private cuponsDb: Cupom[] = [
    this.cupom(1, 'BEMVINDO10', '10% no primeiro pedido', 'percentual', 10, null, null, null, true),
    this.cupom(2, 'COMBO5', 'R$ 5 de desconto acima de R$ 30', 'valor', 5, 30, dia(new Date(Date.now() + 30 * 86_400_000)), 100, true),
    this.cupom(3, 'INAUGURACAO', 'Semana de inauguração', 'percentual', 15, null, dia(new Date(Date.now() - 10 * 86_400_000)), null, false),
  ];
  // celulares de mentira; o primeiro já pode trocar o prêmio
  private clientesDb = [
    { id: 1, telefone: '11900000001', selos: 10, resgates: 1, ultimo_pedido_em: new Date(Date.now() - 86_400_000).toISOString() },
    { id: 2, telefone: '11900000002', selos: 6, resgates: 0, ultimo_pedido_em: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    { id: 3, telefone: '21900000003', selos: 2, resgates: 0, ultimo_pedido_em: new Date(Date.now() - 4 * 86_400_000).toISOString() },
  ];
  // o cheddar começa abaixo do mínimo pra aparecer o aviso
  private insumosDb: Insumo[] = [
    this.insumo(1, 'Pão brioche', 'un', 80, 20),
    this.insumo(2, 'Blend smash 90g', 'un', 120, 30),
    this.insumo(3, 'Bacon', 'g', 1800, 500),
    this.insumo(4, 'Queijo cheddar', 'un', 26, 30),
    this.insumo(5, 'Batata palito', 'g', 9000, 2000),
    this.insumo(6, 'Sorvete de chocolate', 'ml', 4000, 1000),
  ];
  private fichas = new Map<number, { insumo_id: number; quantidade: number }[]>(
    Object.entries({
      'X-Bacon Artesanal': [[1, 1], [2, 2], [3, 40], [4, 2]],
      'Combo Smash': [[1, 1], [2, 2], [4, 1], [5, 150]],
      'Batata Suprema': [[5, 300], [3, 30], [4, 1]],
      'Milkshake Chocolate': [[6, 250]],
    })
      .map(([nome, linhas]) => [this.produtosDb.find((p) => p.nome === nome)?.id ?? 0, linhas.map(([insumo_id, quantidade]) => ({ insumo_id, quantidade }))] as const)
      .filter(([id]) => id > 0),
  );
  // o que precisa ser desfeito se o pedido for cancelado
  private extrasPedido = new Map<number, { cupomId?: number; clienteId?: number; resgate?: boolean }>();
  private totensDb: Totem[] = [
    { id: 1, codigo: 'TOTEM-01', localizacao: 'Entrada principal', status: { valor: 'online', rotulo: 'Online' } },
    { id: 2, codigo: 'TOTEM-02', localizacao: 'Balcão lateral', status: { valor: 'online', rotulo: 'Online' } },
    { id: 3, codigo: 'TOTEM-03', localizacao: 'Área externa', status: { valor: 'manutencao', rotulo: 'Manutenção' } },
  ];
  // todos os pedidos; a cozinha e o totem acompanham as mudanças por aqui
  readonly pedidos$ = new BehaviorSubject<Pedido[]>(this.gerarPedidos());

  private get pedidosDb(): Pedido[] {
    return this.pedidos$.value;
  }
  private caixas: Caixa[] = [];
  private movimentosDb: Movimento[] = [];
  private proximoId = 1000;

  constructor() {
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
          insumos: this.insumosDb.filter((i) => i.acabando).slice(0, 6),
        },
        operacao: this.operacao(),
        avaliacoes: this.avaliacoes(),
        recentes: [...this.pedidosDb].sort((a, b) => Date.parse(b.criado_em) - Date.parse(a.criado_em)).slice(0, 6),
      };
    });
  }

  // mesmo cálculo do DashboardController: últimos 7 dias, sem cancelados
  private operacao(): Dashboard['operacao'] {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);
    const semana = this.pedidosDb.filter((p) => Date.parse(p.criado_em) >= inicio.getTime() && p.status.valor !== 'cancelado');

    const porHora = new Map<number, number>();
    semana.forEach((p) => porHora.set(new Date(p.criado_em).getHours(), (porHora.get(new Date(p.criado_em).getHours()) ?? 0) + 1));
    const horas = [...porHora.keys()];
    const de = Math.min(11, ...horas);
    const ate = Math.max(22, ...horas);

    const prontos = semana.filter((p) => p.pronto_em);
    const minutos = prontos.map((p) => Math.max(0, Math.floor((Date.parse(p.pronto_em!) - Date.parse(p.criado_em)) / 60_000)));
    const media = (lista: number[]) => (lista.length ? Math.round(lista.reduce((s, n) => s + n, 0) / lista.length) : null);

    return {
      por_hora: Array.from({ length: ate - de + 1 }, (_, i) => ({ hora: de + i, pedidos: porHora.get(de + i) ?? 0 })),
      preparo: {
        pedidos: prontos.length,
        medio_min: media(minutos),
        previsto_min: media(prontos.map((p) => p.tempo_estimado_min)),
        no_prazo_pct: prontos.length ? Math.round((prontos.filter((p, i) => minutos[i] <= p.tempo_estimado_min).length / prontos.length) * 100) : null,
      },
    };
  }

  private avaliacoes(): Dashboard['avaliacoes'] {
    const limite = Date.now() - 30 * 86_400_000;
    const avaliados = this.pedidosDb.filter((p) => p.avaliacao && Date.parse(p.avaliacao.em ?? p.criado_em) >= limite);
    const notas = avaliados.map((p) => p.avaliacao!.nota);
    return {
      media: notas.length ? Math.round((notas.reduce((s, n) => s + n, 0) / notas.length) * 10) / 10 : null,
      quantidade: notas.length,
      por_nota: [5, 4, 3, 2, 1].map((nota) => ({ nota, quantidade: notas.filter((n) => n === nota).length })),
      comentarios: avaliados
        .filter((p) => p.avaliacao!.comentario)
        .sort((a, b) => Date.parse(b.avaliacao!.em ?? '') - Date.parse(a.avaliacao!.em ?? ''))
        .slice(0, 4)
        .map((p) => ({ codigo: p.codigo, nome_cliente: p.nome_cliente, nota: p.avaliacao!.nota, comentario: p.avaliacao!.comentario!, em: p.avaliacao!.em! })),
    };
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
      // igual à API: os produtos ficam sem categoria
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
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((p) => this.comFicha(p));
    });
  }

  private comFicha(p: ProdutoPainel): ProdutoPainel {
    const ficha: ItemFicha[] = (this.fichas.get(p.id) ?? []).map((l) => {
      const insumo = this.insumosDb.find((i) => i.id === l.insumo_id)!;
      return { insumo_id: l.insumo_id, nome: insumo.nome, unidade: insumo.unidade, quantidade: l.quantidade };
    });
    return { ...p, ficha, disponivel: this.disponivel(p) };
  }

  // o menor entre o estoque do produto e o que os insumos da ficha ainda rendem
  private disponivel(p: { id: number; estoque: number }): number {
    const rende = (this.fichas.get(p.id) ?? []).map((l) => {
      const insumo = this.insumosDb.find((i) => i.id === l.insumo_id);
      return insumo ? Math.floor(insumo.estoque / l.quantidade + 1e-9) : Infinity;
    });
    return Math.min(p.estoque, ...rende);
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
      (dados.ficha ?? []).forEach((l, i) => {
        if (!(l.quantidade > 0)) campos[`ficha.${i}.quantidade`] = 'A quantidade do insumo precisa ser maior que zero.';
      });
      if (new Set((dados.ficha ?? []).map((l) => l.insumo_id)).size !== (dados.ficha ?? []).length) {
        campos['ficha'] = 'O mesmo insumo aparece duas vezes na ficha.';
      }
      if (Object.keys(campos).length) throw new FalhaFormulario(Object.values(campos)[0], campos);

      const anterior = this.produtosDb.find((p) => p.id === id);
      const categoria = this.categoriasDb.find((c) => c.id === dados.categoria_id);
      const { ficha, ...resto } = dados;
      const produto: ProdutoPainel = {
        ...(anterior ?? {}),
        id: id ?? this.novoId(),
        imagem_url: anterior?.imagem_url ?? null,
        ...resto,
        nome: dados.nome.trim(),
        categoria: categoria ? { id: categoria.id, nome: categoria.nome } : null,
      } as ProdutoPainel;
      if (ficha) this.fichas.set(produto.id, ficha.map((l) => ({ insumo_id: l.insumo_id, quantidade: l.quantidade })));
      this.produtosDb = id ? this.produtosDb.map((p) => (p.id === id ? produto : p)) : [...this.produtosDb, produto];
      return this.comFicha(produto);
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

  salvarConfiguracoes(
    dados: Partial<Omit<Configuracoes, 'fidelidade'>> & { fidelidade_ativa?: boolean; fidelidade_meta?: number; fidelidade_premio?: number },
  ): Observable<Configuracoes> {
    return this.responder(() => {
      const campos: Record<string, string> = {};
      if (dados.nome_loja !== undefined && !dados.nome_loja.trim()) campos['nome_loja'] = 'O nome da loja é obrigatório.';
      if (dados.tempo_espera_min !== undefined && !(dados.tempo_espera_min >= 1)) campos['tempo_espera_min'] = 'Informe pelo menos 1 minuto.';
      if (dados.estoque_baixo !== undefined && !(dados.estoque_baixo >= 0)) campos['estoque_baixo'] = 'Informe um número igual ou maior que zero.';
      if (dados.fidelidade_meta !== undefined && !(dados.fidelidade_meta >= 2 && dados.fidelidade_meta <= 50)) campos['fidelidade_meta'] = 'Use de 2 a 50 pedidos.';
      if (dados.fidelidade_premio !== undefined && !(dados.fidelidade_premio >= 1 && dados.fidelidade_premio <= 500)) campos['fidelidade_premio'] = 'Use um desconto de R$ 1 a R$ 500.';
      if (Object.keys(campos).length) throw new FalhaFormulario(Object.values(campos)[0], campos);
      const { fidelidade_ativa, fidelidade_meta, fidelidade_premio, ...loja } = dados;
      this.config = {
        ...this.config,
        ...loja,
        fidelidade: {
          ativa: fidelidade_ativa ?? this.config.fidelidade.ativa,
          meta: fidelidade_meta ?? this.config.fidelidade.meta,
          premio: fidelidade_premio !== undefined ? centavos(fidelidade_premio) : this.config.fidelidade.premio,
        },
      };
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

  cardapioTotem(): Cardapio {
    return {
      loja: {
        nome_loja: this.config.nome_loja,
        frase_totem: this.config.frase_totem,
        logo_url: this.config.logo_url,
        tempo_espera_min: this.config.tempo_espera_min,
        fidelidade: { ...this.config.fidelidade },
      },
      categorias: [...this.categoriasDb]
        .filter((c) => c.ativo)
        .sort((a, b) => a.ordem - b.ordem)
        .map((c) => ({
          ...c,
          produtos: this.produtosDb
            .filter((p) => p.categoria_id === c.id && p.ativo && this.disponivel(p) > 0)
            .sort((a, b) => Number(b.destaque) - Number(a.destaque) || a.nome.localeCompare(b.nome))
            .map(({ categoria: _, ficha: __, disponivel: ___, ...p }) => ({ ...structuredClone(p), estoque: this.disponivel(p) })),
        }))
        .filter((c) => c.produtos.length),
    };
  }

  // mesmas regras do PedidoService: preço e estoque do "banco", escolhas obrigatórias
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

    // insumos que o pedido gasta, pela ficha de cada produto
    const gasto = new Map<number, number>();
    const produtoDoInsumo = new Map<number, string>();
    for (const [produtoId, quantidade] of reservado) {
      for (const l of this.fichas.get(produtoId) ?? []) {
        gasto.set(l.insumo_id, (gasto.get(l.insumo_id) ?? 0) + l.quantidade * quantidade);
        if (!produtoDoInsumo.has(l.insumo_id)) produtoDoInsumo.set(l.insumo_id, this.produtosDb.find((p) => p.id === produtoId)!.nome);
      }
    }
    for (const [insumoId, quantidade] of gasto) {
      const insumo = this.insumosDb.find((i) => i.id === insumoId)!;
      if (insumo.estoque + 1e-9 < quantidade) throw new FalhaFormulario(`${produtoDoInsumo.get(insumoId)} acabou por agora (faltou ${insumo.nome}).`);
    }

    const subtotal = centavos(
      novo.itens.reduce((s, i) => s + this.produtosDb.find((p) => p.id === i.produto_id)!.preco * i.quantidade, 0),
    );

    const cupom = novo.cupom?.trim() ? this.validarCupom(novo.cupom, subtotal) : null;
    let desconto = cupom ? this.descontoDoCupom(cupom, subtotal) : 0;

    const telefone = this.config.fidelidade.ativa && novo.telefone?.trim() ? this.telefoneValido(novo.telefone) : null;
    let cliente = telefone ? this.clientesDb.find((c) => c.telefone === telefone) : undefined;
    if (telefone && !cliente) {
      cliente = { id: Math.max(0, ...this.clientesDb.map((c) => c.id)) + 1, telefone, selos: 0, resgates: 0, ultimo_pedido_em: '' };
      this.clientesDb.push(cliente);
    }
    const resgate = !!cliente && !!novo.resgatar_premio;
    if (resgate) {
      if (cupom) throw new FalhaFormulario('Use o cupom ou o prêmio do cartão fidelidade, os dois juntos não dá.', { cupom: 'Use o cupom ou o prêmio.' });
      if (cliente!.selos < this.config.fidelidade.meta) throw new FalhaFormulario('Ainda faltam selos para o prêmio do cartão fidelidade.', { telefone: 'Faltam selos.' });
      desconto = centavos(Math.min(this.config.fidelidade.premio, subtotal));
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

    this.produtosDb = this.produtosDb.map((p) => (reservado.has(p.id) ? { ...p, estoque: p.estoque - reservado.get(p.id)! } : p));
    this.mexerInsumos(gasto, -1);
    if (cupom) this.cuponsDb = this.cuponsDb.map((c) => (c.id === cupom.id ? { ...c, usos: c.usos + 1 } : c));
    if (cliente) {
      cliente.selos = resgate ? cliente.selos - this.config.fidelidade.meta : cliente.selos + 1;
      cliente.resgates += resgate ? 1 : 0;
      cliente.ultimo_pedido_em = agora;
    }
    this.extrasPedido.set(id, { cupomId: cupom?.id, clienteId: cliente?.id, resgate });

    const pedido: Pedido = {
      id,
      codigo: `A${100 + id}`,
      nome_cliente: novo.nome_cliente?.trim() || 'Cliente',
      status: { valor: 'recebido', rotulo: STATUS.recebido },
      proximo_status: { valor: 'em_preparo', rotulo: STATUS.em_preparo },
      status_pagamento: pago ? { valor: 'pago', rotulo: 'Pago' } : { valor: 'pendente', rotulo: 'Pendente' },
      forma_pagamento: { valor: novo.forma_pagamento, rotulo: FORMAS[novo.forma_pagamento] },
      consumo: { valor: novo.consumo ?? 'local', rotulo: CONSUMO[novo.consumo ?? 'local'] },
      subtotal,
      desconto,
      total: centavos(subtotal - desconto),
      cupom: cupom?.codigo ?? null,
      fidelidade: cliente ? { resgate } : null,
      avaliacao: null,
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
      const devolver = new Map<number, number>();
      for (const item of p.itens) {
        this.produtosDb = this.produtosDb.map((prod) =>
          prod.id === item.produto_id ? { ...prod, estoque: prod.estoque + item.quantidade } : prod,
        );
        for (const l of this.fichas.get(item.produto_id ?? 0) ?? []) {
          devolver.set(l.insumo_id, (devolver.get(l.insumo_id) ?? 0) + l.quantidade * item.quantidade);
        }
      }
      this.mexerInsumos(devolver, 1);

      // o uso do cupom e o selo (ou o prêmio) voltam
      const extras = this.extrasPedido.get(p.id);
      if (extras?.cupomId) this.cuponsDb = this.cuponsDb.map((c) => (c.id === extras.cupomId ? { ...c, usos: Math.max(0, c.usos - 1) } : c));
      const cliente = this.clientesDb.find((c) => c.id === extras?.clienteId);
      if (cliente) {
        cliente.selos = extras!.resgate ? cliente.selos + this.config.fidelidade.meta : Math.max(0, cliente.selos - 1);
        cliente.resgates = extras!.resgate ? Math.max(0, cliente.resgates - 1) : cliente.resgates;
      }
      this.extrasPedido.delete(p.id);

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

  acompanhamento(pedido: Pedido): Acompanhamento {
    const atual = ETAPAS.indexOf(pedido.status.valor);
    return {
      codigo: pedido.codigo,
      nome_cliente: pedido.nome_cliente,
      status: pedido.status,
      status_pagamento: pedido.status_pagamento,
      forma_pagamento: pedido.forma_pagamento,
      consumo: pedido.consumo,
      etapas: ETAPAS.map((e, i) => ({ valor: e, rotulo: STATUS[e], concluida: atual >= 0 && i <= atual })),
      subtotal: pedido.subtotal,
      desconto: pedido.desconto,
      total: pedido.total,
      cupom: pedido.cupom,
      avaliacao: pedido.avaliacao?.nota ?? null,
      fidelidade: (() => {
        const cliente = this.clientesDb.find((c) => c.id === this.extrasPedido.get(pedido.id)?.clienteId);
        return cliente ? { selos: cliente.selos, meta: this.config.fidelidade.meta, resgate: !!pedido.fidelidade?.resgate } : null;
      })(),
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

  avaliarPedido(codigo: string, nota: number, comentario: string | null): Pedido {
    const pedido = this.pedidosDb.find((p) => p.codigo === codigo.trim().toUpperCase());
    if (!pedido) throw new FalhaFormulario('Pedido não encontrado.');
    if (!(nota >= 1 && nota <= 5)) throw new FalhaFormulario('Escolha de 1 a 5 estrelas.', { nota: 'Escolha de 1 a 5 estrelas.' });
    if (!['pronto', 'retirado'].includes(pedido.status.valor)) throw new FalhaFormulario('Dá para avaliar quando o pedido ficar pronto.', { nota: 'Ainda não.' });
    if (pedido.avaliacao) throw new FalhaFormulario('Este pedido já foi avaliado. Obrigado!', { nota: 'Já avaliado.' });
    return this.mudarPedido(pedido.id, (p) => ({
      ...p,
      avaliacao: { nota, comentario: comentario?.trim() || null, em: new Date().toISOString() },
    }));
  }

  /* ---------- Promoções ---------- */

  conferirCupom(codigo: string, subtotal: number): CupomAplicado {
    const cupom = this.validarCupom(codigo, subtotal);
    return {
      codigo: cupom.codigo,
      descricao: cupom.descricao,
      tipo: cupom.tipo.valor,
      valor: cupom.valor,
      pedido_minimo: cupom.pedido_minimo,
      desconto: this.descontoDoCupom(cupom, subtotal),
    };
  }

  cupons(): Observable<Cupom[]> {
    return this.responder(() =>
      [...this.cuponsDb].sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.codigo.localeCompare(b.codigo)),
    );
  }

  salvarCupom(dados: CupomForm, id?: number): Observable<Cupom> {
    return this.responder(() => {
      const codigo = dados.codigo.trim().toUpperCase();
      const campos: Record<string, string> = {};
      if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) campos['codigo'] = 'Use de 3 a 30 letras, números, - e _ no código.';
      else if (this.cuponsDb.some((c) => c.codigo === codigo && c.id !== id)) campos['codigo'] = 'Já existe um cupom com esse código.';
      if (!(dados.valor > 0)) campos['valor'] = 'O desconto precisa ser maior que zero.';
      else if (dados.tipo === 'percentual' && dados.valor > 100) campos['valor'] = 'A porcentagem vai até 100.';
      if (Object.keys(campos).length) throw new FalhaFormulario(Object.values(campos)[0], campos);

      const anterior = this.cuponsDb.find((c) => c.id === id);
      const cupom = this.cupom(id ?? this.novoId(), codigo, dados.descricao, dados.tipo, dados.valor, dados.pedido_minimo, dados.validade, dados.limite_usos, dados.ativo, anterior?.usos ?? 0);
      this.cuponsDb = id ? this.cuponsDb.map((c) => (c.id === id ? cupom : c)) : [...this.cuponsDb, cupom];
      return cupom;
    });
  }

  excluirCupom(id: number): Observable<void> {
    return this.responder(() => {
      const cupom = this.cuponsDb.find((c) => c.id === id);
      this.cuponsDb = cupom?.usos
        ? this.cuponsDb.map((c) => (c.id === id ? { ...c, ativo: false } : c))
        : this.cuponsDb.filter((c) => c.id !== id);
    });
  }

  consultarFidelidade(telefone: string): ConsultaFidelidade {
    const numero = this.telefoneValido(telefone);
    const selos = this.clientesDb.find((c) => c.telefone === numero)?.selos ?? 0;
    return { ...this.config.fidelidade, selos, pode_resgatar: selos >= this.config.fidelidade.meta };
  }

  clientesFidelidade(): Observable<ClientesFidelidade> {
    return this.responder(() => ({
      regras: { ...this.config.fidelidade },
      total: this.clientesDb.length,
      clientes: [...this.clientesDb]
        .sort((a, b) => Date.parse(b.ultimo_pedido_em || '0') - Date.parse(a.ultimo_pedido_em || '0'))
        .map((c) => ({
          id: c.id,
          telefone: `(${c.telefone.slice(0, 2)}) ${'•'.repeat(c.telefone.length - 6)}-${c.telefone.slice(-4)}`,
          selos: c.selos,
          resgates: c.resgates,
          pedidos: [...this.extrasPedido.entries()].filter(([pid, e]) => e.clienteId === c.id && this.pedidosDb.find((p) => p.id === pid)?.status.valor !== 'cancelado').length,
          ultimo_pedido_em: c.ultimo_pedido_em || null,
        })),
    }));
  }

  /* ---------- Insumos ---------- */

  insumos(): Observable<Insumo[]> {
    return this.responder(() =>
      [...this.insumosDb]
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((i) => ({
          ...i,
          usado_em: this.produtosDb.filter((p) => (this.fichas.get(p.id) ?? []).some((l) => l.insumo_id === i.id)).map((p) => p.nome),
        })),
    );
  }

  salvarInsumo(dados: InsumoForm, id?: number): Observable<Insumo> {
    return this.responder(() => {
      const nome = dados.nome.trim();
      const campos: Record<string, string> = {};
      if (!nome) campos['nome'] = 'O nome é obrigatório.';
      else if (this.insumosDb.some((i) => i.nome.toLowerCase() === nome.toLowerCase() && i.id !== id)) campos['nome'] = 'Já existe um insumo com esse nome.';
      if (!(dados.estoque >= 0)) campos['estoque'] = 'Informe um estoque igual ou maior que zero.';
      if (dados.estoque_minimo !== null && !(dados.estoque_minimo >= 0)) campos['estoque_minimo'] = 'Informe um número igual ou maior que zero.';
      if (Object.keys(campos).length) throw new FalhaFormulario(Object.values(campos)[0], campos);

      const insumo = this.insumo(id ?? this.novoId(), nome, dados.unidade, dados.estoque, dados.estoque_minimo);
      this.insumosDb = id ? this.insumosDb.map((i) => (i.id === id ? insumo : i)) : [...this.insumosDb, insumo];
      return insumo;
    });
  }

  entradaInsumo(id: number, quantidade: number): Observable<Insumo> {
    return this.responder(() => {
      if (!(quantidade > 0)) throw new FalhaFormulario('Digite quanto chegou.');
      this.mexerInsumos(new Map([[id, quantidade]]), 1);
      return this.insumosDb.find((i) => i.id === id)!;
    });
  }

  excluirInsumo(id: number): Observable<void> {
    return this.responder(() => {
      if ([...this.fichas.values()].some((f) => f.some((l) => l.insumo_id === id))) {
        throw new FalhaFormulario('Este insumo está na ficha de algum produto. Tire ele de lá antes de excluir.');
      }
      this.insumosDb = this.insumosDb.filter((i) => i.id !== id);
    });
  }

  pedidosPagos(inicio: string, fim: string): Observable<Pedido[]> {
    return this.responder(() =>
      this.pedidosDb
        .filter((p) => p.status_pagamento.valor === 'pago' && p.pago_em && dia(new Date(p.pago_em)) >= inicio && dia(new Date(p.pago_em)) <= fim)
        .sort((a, b) => Date.parse(a.pago_em!) - Date.parse(b.pago_em!)),
    );
  }

  private validarCupom(codigo: string, subtotal: number): Cupom {
    const cupom = this.cuponsDb.find((c) => c.codigo === codigo.trim().toUpperCase());
    const problema = !cupom
      ? 'Não encontramos esse cupom. Confira as letras.'
      : !cupom.ativo
        ? 'Este cupom não está mais valendo.'
        : cupom.validade && cupom.validade < dia(new Date())
          ? 'Este cupom venceu.'
          : cupom.limite_usos !== null && cupom.usos >= cupom.limite_usos
            ? 'Este cupom já atingiu o limite de usos.'
            : cupom.pedido_minimo !== null && subtotal < cupom.pedido_minimo
              ? `Este cupom vale para pedidos a partir de R$ ${cupom.pedido_minimo.toFixed(2).replace('.', ',')}.`
              : null;
    if (problema) throw new FalhaFormulario(problema, { cupom: problema });
    return cupom!;
  }

  private descontoDoCupom(cupom: Cupom, subtotal: number): number {
    const bruto = cupom.tipo.valor === 'percentual' ? (subtotal * cupom.valor) / 100 : cupom.valor;
    return centavos(Math.min(bruto, subtotal));
  }

  private telefoneValido(telefone: string): string {
    const numero = telefone.replace(/\D/g, '');
    if (numero.length < 10 || numero.length > 11) {
      throw new FalhaFormulario('Confira o celular com DDD, por exemplo (11) 98765-4321.', { telefone: 'Celular inválido.' });
    }
    return numero;
  }

  private mexerInsumos(quantidades: Map<number, number>, sinal: 1 | -1): void {
    this.insumosDb = this.insumosDb.map((i) =>
      quantidades.has(i.id) ? this.insumo(i.id, i.nome, i.unidade, i.estoque + sinal * quantidades.get(i.id)!, i.estoque_minimo) : i,
    );
  }

  private cupom(
    id: number, codigo: string, descricao: string | null, tipo: 'percentual' | 'valor', valor: number,
    pedido_minimo: number | null, validade: string | null, limite_usos: number | null, ativo: boolean, usos = 0,
  ): Cupom {
    return {
      id, codigo, descricao, valor, pedido_minimo, validade, limite_usos, ativo, usos,
      tipo: { valor: tipo, rotulo: tipo === 'percentual' ? 'Porcentagem' : 'Valor fixo' },
    };
  }

  private insumo(id: number, nome: string, unidade: Insumo['unidade'], estoque: number, estoque_minimo: number | null): Insumo {
    const arredondado = Math.round(estoque * 1000) / 1000;
    return { id, nome, unidade, estoque: arredondado, estoque_minimo, acabando: estoque_minimo !== null && arredondado <= estoque_minimo };
  }

  /* ---------- Auxiliares ---------- */

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
      areas: ativo ? PAPEIS[papel].areas : [],
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

  // mesmo cálculo do FinanceiroService da API: só pedidos pagos, pela data do pagamento
  private calcularVendas(inicio: string, fim: string): Vendas {
    const pagos = this.pedidosDb.filter((p) => {
      if (p.status_pagamento.valor !== 'pago' || !p.pago_em) return false;
      const d = dia(new Date(p.pago_em));
      return d >= inicio && d <= fim;
    });

    const total = centavos(pagos.reduce((s, p) => s + p.total, 0));
    const por_forma: TotalForma[] = (Object.keys(FORMAS) as FormaPagamento[]).map((f) => {
      const daForma = pagos.filter((p) => p.forma_pagamento.valor === f);
      return {
        valor: f,
        rotulo: FORMAS[f],
        total: centavos(daForma.reduce((s, p) => s + p.total, 0)),
        quantidade: daForma.length,
      };
    });

    const por_dia: VendaDia[] = [];
    for (let d = new Date(`${inicio}T12:00:00`); dia(d) <= fim; d.setDate(d.getDate() + 1)) {
      const doDia = pagos.filter((p) => dia(new Date(p.pago_em!)) === dia(d));
      por_dia.push({ data: dia(d), total: centavos(doDia.reduce((s, p) => s + p.total, 0)), quantidade: doDia.length });
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
      const subtotal = centavos(itens.reduce((s, i) => s + i.total, 0));
      const consumo: Consumo = aleatorio() < 0.4 ? 'viagem' : 'local';
      const preparo = Math.max(4, tempo + Math.floor(aleatorio() * 13) - 4);
      // mais ou menos metade avalia, quase sempre bem
      const nota = status === 'retirado' && aleatorio() < 0.5 ? [5, 5, 5, 4, 4, 4, 3, 2][Math.floor(aleatorio() * 8)] : null;
      const comentario = nota && aleatorio() < 0.34 ? COMENTARIOS[nota][Math.floor(aleatorio() * COMENTARIOS[nota].length)] : null;
      pedidos.push({
        id,
        codigo: `A${100 + id}`,
        nome_cliente: CLIENTES[Math.floor(aleatorio() * CLIENTES.length)],
        status: statusOpcao,
        proximo_status: null,
        status_pagamento: pago ? { valor: 'pago', rotulo: 'Pago' } : { valor: 'pendente', rotulo: 'Pendente' },
        forma_pagamento: { valor: formaPedido, rotulo: FORMAS[formaPedido] },
        consumo: { valor: consumo, rotulo: CONSUMO[consumo] },
        subtotal,
        desconto: 0,
        total: subtotal,
        cupom: null,
        fidelidade: null,
        avaliacao: nota ? { nota, comentario, em: new Date(quando.getTime() + 35 * 60_000).toISOString() } : null,
        tempo_estimado_min: tempo,
        minutos_decorridos: 0,
        minutos_atraso: 0,
        totem: aleatorio() < 0.55 ? 'TOTEM-01' : 'TOTEM-02',
        itens,
        criado_em: quando.toISOString(),
        pago_em: pago ? quando.toISOString() : null,
        pronto_em: ['pronto', 'retirado'].includes(status) ? new Date(quando.getTime() + preparo * 60_000).toISOString() : null,
        finalizado_em: status === 'retirado' ? new Date(quando.getTime() + (preparo + 5) * 60_000).toISOString() : null,
      });
      id++;
    };

    for (let diasAtras = 7; diasAtras >= 1; diasAtras--) {
      const data = new Date();
      data.setDate(data.getDate() - diasAtras);
      const fimDeSemana = [0, 5, 6].includes(data.getDay());
      const quantidade = (fimDeSemana ? 15 : 9) + Math.floor(aleatorio() * 6);
      for (let i = 0; i < quantidade; i++) {
        const quando = new Date(data);
        quando.setHours(HORARIOS[Math.floor(aleatorio() * HORARIOS.length)], Math.floor(aleatorio() * 60), 0, 0);
        criar(quando, aleatorio() < 0.04 ? 'cancelado' : 'retirado');
      }
    }

    const minutos = (m: number) => new Date(Date.now() - m * 60_000);
    for (let i = 0; i < 6; i++) criar(minutos(90 + i * 25), 'retirado');
    criar(minutos(32), 'em_preparo');
    criar(minutos(12), 'em_preparo');
    criar(minutos(6), 'pronto');
    criar(minutos(3), 'recebido');
    criar(minutos(1), 'recebido', 'dinheiro');

    const observacoes = ['Sem cebola', 'Molho à parte'];
    const fila = pedidos.filter((p) => ['recebido', 'em_preparo'].includes(p.status.valor));
    fila.slice(-2).forEach((p, i) => (p.itens[0] = { ...p.itens[0], observacao: observacoes[i] }));

    // cancelados devolvem o dinheiro: não contam como pagos
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
