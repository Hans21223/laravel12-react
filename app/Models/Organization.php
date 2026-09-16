<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Organization extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['database_credentials'];

    protected function casts(): array
    {
        return ['database_credentials' => 'encrypted:array', 'is_legacy' => 'boolean'];
    }

    public function memberships()
    {
        return $this->hasMany(OrganizationMembership::class);
    }

    public function publicPayload(): array
    {
        return $this->only('id', 'uuid', 'name', 'owner_user_id', 'status', 'is_legacy');
    }
}
