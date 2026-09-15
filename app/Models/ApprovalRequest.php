<?php

namespace App\Models;

use App\Models\Concerns\UsesTenantDatabase;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ApprovalRequest extends Model
{
    use SoftDeletes;
    use UsesTenantDatabase;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'submitted_at' => 'datetime', 'decided_at' => 'datetime', 'version' => 'integer'];
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id')->select('id', 'name', 'department', 'avatar_path');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewer_id')->select('id', 'name');
    }

    public function events()
    {
        return $this->hasMany(ApprovalEvent::class)->orderBy('id');
    }

    public function steps()
    {
        return $this->hasMany(ApprovalStep::class)->orderBy('round')->orderBy('position');
    }

    public function attachments()
    {
        return $this->hasMany(ApprovalAttachment::class)->orderBy('id');
    }

    public function scopeAwaitingReviewer(Builder $query, User $user): void
    {
        $query->where('status', 'pending')->where('user_id', '!=', $user->id)
            ->where(fn (Builder $q) => $q->where('route_mode', 'standard')->orWhereHas('steps', fn (Builder $step) => $step
                ->whereColumn('round', 'approval_requests.approval_round')->where('status', 'pending')->where('reviewer_id', $user->id)));
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
