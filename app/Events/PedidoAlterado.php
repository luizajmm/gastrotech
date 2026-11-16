<?php

namespace App\Events;

use App\Http\Resources\PedidoResource;
use App\Models\Pedido;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Avisa a cozinha e o painel (canal privado) que um pedido foi criado ou mudou.
 * "Now" = enviado na hora, sem precisar de fila rodando.
 */
class PedidoAlterado implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    /**
     * @param  'criado'|'atualizado'  $acao
     */
    public function __construct(public Pedido $pedido, public string $acao) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel('cozinha')];
    }

    public function broadcastAs(): string
    {
        return 'pedido.'.$this->acao;
    }

    public function broadcastWith(): array
    {
        $this->pedido->loadMissing(['itens', 'totem']);

        return ['pedido' => (new PedidoResource($this->pedido))->resolve()];
    }
}
