<?php

namespace App\Models;

use App\Enums\StatusTotem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Totem extends Model
{
    protected $table = 'totens';

    protected $fillable = ['codigo', 'localizacao', 'status'];

    protected function casts(): array
    {
        return ['status' => StatusTotem::class];
    }

    public function pedidos(): HasMany
    {
        return $this->hasMany(Pedido::class);
    }
}
