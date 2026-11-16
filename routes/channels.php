<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
| Canal privado da cozinha/painel: qualquer usuário logado e ativo.
| O canal "pedido.{codigo}" é público (tela de acompanhamento do cliente)
| e não precisa ser registrado aqui.
*/

Broadcast::channel('cozinha', fn (User $usuario) => $usuario->ativo);
