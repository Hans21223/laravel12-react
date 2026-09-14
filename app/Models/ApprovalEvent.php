<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalEvent extends Model
{
    protected $guarded = ['id'];

    public function actor()
    {
        return $this->belongsTo(User::class, 'user_id')->select('id', 'name');
    }
}
