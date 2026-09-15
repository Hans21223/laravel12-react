<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalStep extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['round' => 'integer', 'position' => 'integer', 'decided_at' => 'datetime'];
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id')->select('id', 'name', 'department', 'avatar_path');
    }
}
