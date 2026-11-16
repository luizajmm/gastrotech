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
            ->with('categoria')
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
        $produto = Produto::query()->create($request->validated());

        return (new ProdutoResource($produto->load('categoria')))->response()->setStatusCode(201);
    }

    public function show(Produto $produto): ProdutoResource
    {
        return new ProdutoResource($produto->load('categoria'));
    }

    public function update(SalvarProdutoRequest $request, Produto $produto): ProdutoResource
    {
        $produto->update($request->validated());

        return new ProdutoResource($produto->load('categoria'));
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

    /** Envia ou troca a foto do produto. */
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
