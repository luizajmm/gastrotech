<?php

namespace App\Models;

use App\Enums\Papel;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

// usuário do painel (antiga tabela "administradores")
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'papel',
        'ativo',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $attributes = [
        'papel' => 'leitura',
        'ativo' => true,
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'papel' => Papel::class,
            'ativo' => 'boolean',
        ];
    }

    public function podeVer(string $area): bool
    {
        return $this->ativo && $this->papel->podeVer($area);
    }

    public function pode(string $permissao): bool
    {
        return $this->ativo && $this->papel->pode($permissao);
    }

    public function ehAdministrador(): bool
    {
        return $this->papel === Papel::Administrador;
    }
}
