<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApprovalRequest extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'submitted_at' => 'datetime', 'decided_at' => 'datetime', 'version' => 'integer'];
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id')->select('id', 'name', 'department');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id')->select('id', 'name');
    }

    public function events()
    {
        return $this->hasMany(ApprovalEvent::class)->orderBy('id');
    }

    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $query->where(function (Builder $q) use ($user) {
            $q->where('user_id', $user->id);
            if ($user->role === 'manager') {
                $q->orWhere('status', '!=', 'draft');
            }
        });
    }
}
