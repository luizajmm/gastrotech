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
    /**
     * Permissões do painel. Cada uma vira um Gate usado nas rotas
     * com o middleware "can:<permissao>". Quem tem cada uma está em App\Enums\Papel.
     */
    public const PERMISSOES = ['cardapio', 'pedidos', 'caixa', 'usuarios', 'configuracoes'];

    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        foreach (self::PERMISSOES as $permissao) {
            Gate::define($permissao, fn (User $usuario) => $usuario->pode($permissao));
        }

        // Tentativas de login: 5 por minuto por e-mail + IP.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));

        // Pedidos do totem: evita que alguém dispare pedidos em massa.
        RateLimiter::for('totem', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));
    }
}
