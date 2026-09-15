<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationMembership extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['suspended' => 'boolean'];
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
