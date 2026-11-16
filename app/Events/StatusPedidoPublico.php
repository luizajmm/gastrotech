<?php

namespace App\Events;

use App\Http\Resources\AcompanhamentoPedidoResource;
use App\Models\Pedido;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Atualiza a tela de acompanhamento do cliente (canal público do pedido).
 * Envia só os dados que o cliente já vê na tela.
 */
class StatusPedidoPublico implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public Pedido $pedido) {}

    public function broadcastOn(): array
    {
        return [new Channel('pedido.'.$this->pedido->codigo)];
    }

    public function broadcastAs(): string
    {
        return 'status.alterado';
    }

    public function broadcastWith(): array
    {
        $this->pedido->loadMissing('itens');

        return ['pedido' => (new AcompanhamentoPedidoResource($this->pedido))->resolve()];
    }
}
