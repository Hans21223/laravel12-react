<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Services\TenantContext;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'avatar_path',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'preferences' => 'array',
        ];
    }

    protected $appends = ['avatar_url'];

    public function getConnectionName()
    {
        return config('database.default');
    }

    public function memberships()
    {
        return $this->hasMany(OrganizationMembership::class);
    }

    public function activeMembership(): ?OrganizationMembership
    {
        $org = app(TenantContext::class)->organization;

        return $org ? $this->memberships()->where('organization_id', $org->id)->where('suspended', false)->first() : null;
    }

    public function getRoleAttribute($value): string
    {
        return config('tenancy.enabled') && app(TenantContext::class)->organization ? ($this->activeMembership()?->role ?? 'employee') : ($value ?? 'employee');
    }

    public function getDepartmentAttribute($value): string
    {
        return config('tenancy.enabled') && app(TenantContext::class)->organization ? ($this->activeMembership()?->department ?? 'Operations') : ($value ?? 'Operations');
    }

    public function scopeInOrganization($query)
    {
        if (! config('tenancy.enabled')) {
            return $query;
        }
        $id = app(TenantContext::class)->organization?->id;

        return $query->whereHas('memberships', fn ($m) => $m->where('organization_id', $id ?? 0)->where('suspended', false));
    }

    public function scopeOrganizationManagers($query)
    {
        if (! config('tenancy.enabled')) {
            return $query->where('role', 'manager');
        }
        $id = app(TenantContext::class)->organization?->id;

        return $query->whereHas('memberships', fn ($m) => $m->where('organization_id', $id ?? 0)->where('suspended', false)->where('role', 'manager'));
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar_path
            ? '/api/approvals/avatars/'.$this->id.'?v='.substr(sha1($this->avatar_path), 0, 12).(config('tenancy.enabled') ? '&organization_id='.(app(TenantContext::class)->organization?->id ?? 0) : '')
            : null;
    }

    public function settingsPayload(): array
    {
        $payload = $this->only('id', 'name', 'email', 'email_verified_at', 'role', 'department', 'locale', 'avatar_url', 'preferences');
        if (config('tenancy.enabled')) {
            $payload['organization'] = app(TenantContext::class)->organization?->publicPayload();
            $payload['organizations'] = $this->memberships()->where('suspended', false)->with('organization')->get()->map(fn ($m) => [...$m->organization->publicPayload(), 'role' => $m->role])->values();
            $payload['tenancy_enabled'] = true;
        }

        return $payload;
    }
}
