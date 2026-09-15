<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalAttachment extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['storage_path'];
}
