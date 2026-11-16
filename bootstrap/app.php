<?php

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['prefix' => 'api', 'middleware' => ['auth:sanctum', 'ativo']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API usa token (Bearer), então não há redirecionamento para tela de login.
        $middleware->redirectGuestsTo(fn () => null);

        $middleware->alias([
            'ativo' => \App\Http\Middleware\GarantirUsuarioAtivo::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Toda rota /api responde em JSON, inclusive erros.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            return response()->json(['message' => 'Faça login para continuar.'], 401);
        });

        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            return response()->json([
                'message' => 'Você não tem permissão para fazer isso.',
            ], 403);
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            return response()->json([
                'message' => 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
            ], 429, $e->getHeaders());
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($e->getPrevious() instanceof ModelNotFoundException) {
                return response()->json(['message' => 'Registro não encontrado.'], 404);
            }

            return response()->json(['message' => 'Endereço não encontrado.'], 404);
        });
    })->create();
