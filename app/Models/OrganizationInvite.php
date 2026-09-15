<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationInvite extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['key_hash'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'revoked_at' => 'datetime'];
    }
}
