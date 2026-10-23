<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'full_name',
        'email',
        'phone',
        'password_hash',
        'role',
        'status',
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password_hash' => 'hashed',
            'email' => 'string',
        ];
    }

    public function getAuthPasswordName(): string
    {
        return 'password_hash';
    }

    public function hasLegacyPasswordHash(): bool
    {
        return str_starts_with($this->password_hash, 'scrypt:')
            || str_starts_with($this->password_hash, 'pbkdf2:');
    }

    public function farms(): HasMany
    {
        return $this->hasMany(Farm::class, 'producer_id');
    }

    public function customerOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'customer_id');
    }

    public function customerConversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'customer_id');
    }

    public function producerConversations(): HasMany
    {
        return $this->hasMany(Conversation::class, 'producer_id');
    }
}
