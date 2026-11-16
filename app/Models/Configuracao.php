<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

// configurações da loja no formato chave/valor
// (nome, frase do totem, logo, tempo de espera...)
class Configuracao extends Model
{
    protected $table = 'configuracoes';

    protected $primaryKey = 'chave';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['chave', 'valor', 'descricao'];

    private const CACHE = 'configuracoes.todas';

    // valores usados quando a chave ainda não existe no banco
    public const PADROES = [
        'nome_loja' => 'GastroTech',
        'frase_totem' => 'Monte seu pedido do seu jeito.',
        'logo' => null,
        'tempo_espera_min' => '18',
        'estoque_baixo' => '10',
    ];

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget(self::CACHE));
        static::deleted(fn () => Cache::forget(self::CACHE));
    }

    public static function todas(): array
    {
        $salvas = Cache::rememberForever(
            self::CACHE,
            fn () => static::query()->pluck('valor', 'chave')->all(),
        );

        return array_merge(self::PADROES, $salvas);
    }

    public static function valor(string $chave, ?string $padrao = null): ?string
    {
        return static::todas()[$chave] ?? $padrao;
    }

    public static function inteiro(string $chave): int
    {
        return (int) static::valor($chave, '0');
    }

    public static function definir(string $chave, ?string $valor, ?string $descricao = null): void
    {
        $dados = ['valor' => $valor];

        if ($descricao !== null) {
            $dados['descricao'] = $descricao;
        }

        static::query()->updateOrCreate(['chave' => $chave], $dados);
    }

    // dados da loja que podem ser vistos por qualquer pessoa (totem)
    public static function publicas(): array
    {
        $todas = static::todas();

        return [
            'nome_loja' => $todas['nome_loja'],
            'frase_totem' => $todas['frase_totem'],
            'logo_url' => $todas['logo'] ? Storage::disk('public')->url($todas['logo']) : null,
            'tempo_espera_min' => (int) $todas['tempo_espera_min'],
        ];
    }
}
