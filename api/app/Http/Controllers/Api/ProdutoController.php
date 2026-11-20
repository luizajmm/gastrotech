<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImagemRequest;
use App\Http\Requests\SalvarProdutoRequest;
use App\Http\Resources\ProdutoResource;
use App\Models\Configuracao;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProdutoController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'busca' => ['nullable', 'string', 'max:100'],
            'categoria_id' => ['nullable', 'integer'],
            'situacao' => ['nullable', 'in:ativos,inativos,estoque_baixo'],
        ]);

        $produtos = Produto::query()
            ->with(['categoria', 'insumos'])
            ->when($request->filled('busca'), function ($q) use ($request) {
                $termo = '%'.$request->string('busca')->trim().'%';
                $q->where(fn ($q) => $q->where('nome', 'like', $termo)->orWhere('descricao', 'like', $termo));
            })
            ->when($request->filled('categoria_id'), fn ($q) => $q->where('categoria_id', $request->integer('categoria_id')))
            ->when($request->input('situacao') === 'ativos', fn ($q) => $q->where('ativo', true))
            ->when($request->input('situacao') === 'inativos', fn ($q) => $q->where('ativo', false))
            ->when($request->input('situacao') === 'estoque_baixo', fn ($q) => $q->estoqueBaixo(Configuracao::inteiro('estoque_baixo')))
            ->orderBy('nome')
            ->get();

        return ProdutoResource::collection($produtos);
    }

    public function store(SalvarProdutoRequest $request): JsonResponse
    {
        $produto = DB::transaction(function () use ($request) {
            $produto = Produto::query()->create($request->safe()->except('ficha'));
            $this->salvarFicha($produto, $request);

            return $produto;
        });

        return (new ProdutoResource($produto->load(['categoria', 'insumos'])))->response()->setStatusCode(201);
    }

    public function show(Produto $produto): ProdutoResource
    {
        return new ProdutoResource($produto->load(['categoria', 'insumos']));
    }

    public function update(SalvarProdutoRequest $request, Produto $produto): ProdutoResource
    {
        DB::transaction(function () use ($request, $produto) {
            $produto->update($request->safe()->except('ficha'));
            $this->salvarFicha($produto, $request);
        });

        return new ProdutoResource($produto->load(['categoria', 'insumos']));
    }

    // só mexe na ficha quando ela vem no corpo (a tela de cardápio às vezes só troca o "ativo")
    private function salvarFicha(Produto $produto, SalvarProdutoRequest $request): void
    {
        if (! $request->has('ficha')) {
            return;
        }

        $produto->insumos()->sync(
            collect($request->validated('ficha') ?? [])
                ->mapWithKeys(fn ($linha) => [$linha['insumo_id'] => ['quantidade' => $linha['quantidade']]])
                ->all()
        );
    }

    public function destroy(Produto $produto): JsonResponse
    {
        $imagem = $produto->imagem;
        $produto->delete();

        if ($imagem) {
            Storage::disk('public')->delete($imagem);
        }

        return response()->json(['message' => 'Produto excluído.']);
    }

    public function enviarImagem(ImagemRequest $request, Produto $produto): ProdutoResource
    {
        $antiga = $produto->imagem;
        $produto->update(['imagem' => $request->file('imagem')->store('produtos', 'public')]);

        if ($antiga) {
            Storage::disk('public')->delete($antiga);
        }

        return new ProdutoResource($produto->load('categoria'));
    }

    public function removerImagem(Produto $produto): ProdutoResource
    {
        if ($produto->imagem) {
            Storage::disk('public')->delete($produto->imagem);
            $produto->update(['imagem' => null]);
        }

        return new ProdutoResource($produto->load('categoria'));
    }
}
