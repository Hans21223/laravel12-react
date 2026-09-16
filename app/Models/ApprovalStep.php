<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use Illuminate\Database\Eloquent\Model;

class ApprovalStep extends Model
{
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['round' => 'integer', 'position' => 'integer', 'decided_at' => 'datetime'];
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id')->select('id', 'name', 'department', 'avatar_path');
    }

    public function request()
    {
        return $this->belongsTo(ApprovalRequest::class, 'approval_request_id');
    }
}
