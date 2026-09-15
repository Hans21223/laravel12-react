<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use Illuminate\Database\Eloquent\Model;

class ApprovalEvent extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    public function actor()
    {
        return $this->belongsTo(User::class, 'user_id')->select('id', 'name');
    }
}
