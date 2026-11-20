import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Avisos } from '../core/avisos';
import { CategoriaPainel, GrupoPersonalizacao, Insumo, ProdutoForm, ProdutoPainel } from '../core/modelos';
import { FalhaFormulario, PainelApi } from '../core/painel-api';

interface GrupoEditavel {
  chave: number;
  nome: string;
  opcoes: string;
  obrigatorio: boolean;
}

const lista = (texto: string) =>
  texto
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

@Component({
  selector: 'gt-produto-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './produto-form.html',
  styleUrl: './produto-form.css',
})
export class ProdutoFormJanela implements OnInit {
  private api = inject(PainelApi);
  private avisos = inject(Avisos);

  readonly produto = input<ProdutoPainel | null>(null);
  readonly categorias = input.required<CategoriaPainel[]>();
  readonly fechar = output<void>();
  readonly salvo = output<ProdutoPainel>();

  private janela = viewChild.required<ElementRef<HTMLDialogElement>>('janela');

  protected readonly nome = signal('');
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly descricao = signal('');
  protected readonly preco = signal('');
  protected readonly estoque = signal('0');
  protected readonly tempo = signal('10');
  protected readonly porcao = signal('');
  protected readonly calorias = signal('');
  protected readonly ingredientes = signal('');
  protected readonly destaques = signal('');
  protected readonly tags = signal('');
  protected readonly alergenos = signal('');
  protected readonly destaque = signal(false);
  protected readonly ativo = signal(true);
  protected readonly grupos = signal<GrupoEditavel[]>([]);
  protected readonly insumos = signal<Insumo[]>([]);
  protected readonly ficha = signal<{ chave: number; insumo_id: number; quantidade: string }[]>([]);

  protected readonly fotoAtual = signal<string | null>(null);
  protected readonly fotoNova = signal<File | null>(null);
  protected readonly previa = signal<string | null>(null);
  protected readonly removerFoto = signal(false);

  protected readonly erros = signal<Record<string, string>>({});
  protected readonly erroGeral = signal<string | null>(null);
  protected readonly salvando = signal(false);

  protected readonly titulo = computed(() => (this.produto() ? `Editar ${this.produto()!.nome}` : 'Novo produto'));
  protected readonly fotoExibida = computed(() => this.previa() ?? (this.removerFoto() ? null : this.fotoAtual()));

  private proximaChave = 1;

  constructor() {
    afterNextRender(() => this.janela().nativeElement.showModal());
  }

  ngOnInit(): void {
    firstValueFrom(this.api.insumos())
      .then((lista) => this.insumos.set(lista))
      .catch(() => this.insumos.set([]));

    const p = this.produto();
    if (!p) return;

    this.ficha.set(
      (p.ficha ?? []).map((f) => ({
        chave: this.proximaChave++,
        insumo_id: f.insumo_id,
        quantidade: String(f.quantidade).replace('.', ','),
      })),
    );

    this.nome.set(p.nome);
    this.categoriaId.set(p.categoria_id);
    this.descricao.set(p.descricao ?? '');
    this.preco.set(String(p.preco).replace('.', ','));
    this.estoque.set(String(p.estoque));
    this.tempo.set(String(p.tempo_preparo_min));
    this.porcao.set(p.porcao ?? '');
    this.calorias.set(p.calorias != null ? String(p.calorias) : '');
    this.ingredientes.set(p.ingredientes ?? '');
    this.destaques.set(p.destaques.join(', '));
    this.tags.set(p.tags.join(', '));
    this.alergenos.set(p.alergenos.join(', '));
    this.destaque.set(p.destaque);
    this.ativo.set(p.ativo);
    this.fotoAtual.set(p.imagem_url);
    this.grupos.set(
      p.personalizacoes.map((g) => ({
        chave: this.proximaChave++,
        nome: g.nome,
        opcoes: g.opcoes.join(', '),
        obrigatorio: g.obrigatorio,
      })),
    );
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  protected adicionarInsumo(): void {
    const usados = new Set(this.ficha().map((l) => l.insumo_id));
    const livre = this.insumos().find((i) => !usados.has(i.id)) ?? this.insumos()[0];
    this.ficha.update((f) => [...f, { chave: this.proximaChave++, insumo_id: livre.id, quantidade: '1' }]);
  }

  protected alterarFicha(chave: number, mudanca: Partial<{ insumo_id: number; quantidade: string }>): void {
    this.ficha.update((f) => f.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  }

  protected removerInsumo(chave: number): void {
    this.ficha.update((f) => f.filter((l) => l.chave !== chave));
  }

  protected unidadeDe(id: number): string {
    return this.insumos().find((i) => i.id === id)?.unidade ?? '';
  }

  protected adicionarGrupo(): void {
    this.grupos.update((g) => [...g, { chave: this.proximaChave++, nome: '', opcoes: '', obrigatorio: true }]);
  }

  protected alterarGrupo(chave: number, mudanca: Partial<GrupoEditavel>): void {
    this.grupos.update((g) => g.map((grupo) => (grupo.chave === chave ? { ...grupo, ...mudanca } : grupo)));
  }

  protected removerGrupo(chave: number): void {
    this.grupos.update((g) => g.filter((grupo) => grupo.chave !== chave));
  }

  protected opcoesDe(grupo: GrupoEditavel): string[] {
    return lista(grupo.opcoes);
  }

  protected escolherFoto(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0];
    if (!arquivo) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
      this.erros.update((e) => ({ ...e, imagem: 'Envie uma imagem JPG, PNG ou WebP.' }));
      return;
    }

    this.erros.update(({ imagem: _, ...resto }) => resto);
    this.fotoNova.set(arquivo);
    this.removerFoto.set(false);
    const leitor = new FileReader();
    leitor.onload = () => this.previa.set(String(leitor.result));
    leitor.readAsDataURL(arquivo);
  }

  protected tirarFoto(): void {
    this.fotoNova.set(null);
    this.previa.set(null);
    this.removerFoto.set(true);
  }

  protected cliqueNoFundo(evento: MouseEvent): void {
    if (evento.target === this.janela().nativeElement) this.fechar.emit();
  }

  protected async salvar(): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erros.set({});
    this.erroGeral.set(null);

    const numero = (texto: string) => Number(texto.replace(/\./g, '').replace(',', '.'));
    const dados: ProdutoForm = {
      categoria_id: this.categoriaId(),
      nome: this.nome().trim(),
      descricao: this.descricao().trim() || null,
      preco: numero(this.preco()),
      estoque: Math.max(0, Math.round(numero(this.estoque()) || 0)),
      tempo_preparo_min: Math.max(1, Math.round(numero(this.tempo()) || 1)),
      porcao: this.porcao().trim() || null,
      calorias: this.calorias().trim() ? Math.round(numero(this.calorias())) : null,
      ingredientes: this.ingredientes().trim() || null,
      destaques: lista(this.destaques()),
      tags: lista(this.tags()),
      alergenos: lista(this.alergenos()),
      personalizacoes: this.grupos().map<GrupoPersonalizacao>((g) => ({
        nome: g.nome.trim(),
        opcoes: lista(g.opcoes),
        obrigatorio: g.obrigatorio,
      })),
      ficha: this.ficha().map((l) => ({ insumo_id: l.insumo_id, quantidade: numero(l.quantidade) })),
      destaque: this.destaque(),
      ativo: this.ativo(),
    };

    if (dados.ficha!.some((l) => !(l.quantidade > 0))) {
      this.erros.update((e) => ({ ...e, ficha: 'Informe quanto vai de cada insumo, por exemplo 1 ou 0,5.' }));
    }
    if (new Set(dados.ficha!.map((l) => l.insumo_id)).size !== dados.ficha!.length) {
      this.erros.update((e) => ({ ...e, ficha: 'O mesmo insumo aparece duas vezes na ficha.' }));
    }

    if (!dados.nome) this.erros.update((e) => ({ ...e, nome: 'Dê um nome ao produto.' }));
    if (!(dados.preco >= 0) || !this.preco().trim()) this.erros.update((e) => ({ ...e, preco: 'Informe o preço, por exemplo 24,90.' }));
    if (Object.keys(this.erros()).length) {
      this.salvando.set(false);
      return;
    }

    try {
      let produto = await firstValueFrom(this.api.salvarProduto(dados, this.produto()?.id));

      const foto = this.fotoNova();
      if (foto) {
        produto = await firstValueFrom(this.api.enviarImagem(produto.id, foto));
      } else if (this.removerFoto() && this.fotoAtual()) {
        produto = await firstValueFrom(this.api.removerImagem(produto.id));
      }

      this.avisos.sucesso(this.produto() ? 'Produto atualizado.' : 'Produto cadastrado.');
      this.salvo.emit(produto);
    } catch (e) {
      if (e instanceof FalhaFormulario) {
        this.erros.set(e.campos);
        this.erroGeral.set(Object.keys(e.campos).length ? 'Confira os campos destacados.' : e.message);
      } else {
        this.erroGeral.set('Não foi possível salvar o produto.');
      }
    } finally {
      this.salvando.set(false);
    }
  }
}
