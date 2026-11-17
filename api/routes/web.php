<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'aplicacao' => config('app.name'),
    'status' => 'online',
    'documentacao' => 'Veja o README.md na raiz do projeto.',
]));
