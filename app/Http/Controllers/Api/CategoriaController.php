<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SalvarCategoriaRequest;
use App\Http\Resources\CategoriaResource;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoriaController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return CategoriaResource::collection(
            Categoria::query()->ordenadas()->withCount('produtos')->get()
        );
    }

    public function store(SalvarCategoriaRequest $request): JsonResponse
    {
        $categoria = Categoria::query()->create($request->validated());

        return (new CategoriaResource($categoria->loadCount('produtos')))->response()->setStatusCode(201);
    }

    public function show(Categoria $categoria): CategoriaResource
    {
        return new CategoriaResource($categoria->loadCount('produtos'));
    }

    public function update(SalvarCategoriaRequest $request, Categoria $categoria): CategoriaResource
    {
        $categoria->update($request->validated());

        return new CategoriaResource($categoria->loadCount('produtos'));
    }

    /** Os produtos da categoria ficam "sem categoria" (não são apagados). */
    public function destroy(Categoria $categoria): JsonResponse
    {
        $categoria->delete();

        return response()->json(['message' => 'Categoria excluída.']);
    }
}
