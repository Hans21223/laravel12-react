<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use Illuminate\Database\Eloquent\Model;

class ApprovalAttachment extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected $hidden = ['storage_path'];
}
