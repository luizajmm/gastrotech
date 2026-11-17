<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    // cada permissão vira um Gate (can:cardapio, can:ver-cardapio...)
    public const PERMISSOES = ['cardapio', 'pedidos', 'caixa', 'usuarios', 'configuracoes'];

    public function register(): void
    {
    }

    public function boot(): void
    {
        foreach (self::PERMISSOES as $permissao) {
            Gate::define($permissao, fn (User $usuario) => $usuario->pode($permissao));
            Gate::define("ver-$permissao", fn (User $usuario) => $usuario->podeVer($permissao));
        }

        // 5 tentativas de login por minuto
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('totem', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));
    }
}
