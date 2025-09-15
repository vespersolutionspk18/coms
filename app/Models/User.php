<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
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
        'firm_id',
        'status',
        'notification_preferences',
        'phone',
    ];
    
    /**
     * The attributes that should be guarded from mass assignment.
     *
     * @var list<string>
     */
    protected $guarded = [
        'role', // Explicitly guard role field to prevent privilege escalation
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
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
            'notification_preferences' => 'array',
        ];
    }

    public function firm()
    {
        return $this->belongsTo(Firm::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class, 'assigned_user_id');
    }

    public function documents()
    {
        return $this->hasMany(Document::class, 'uploaded_by');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class, 'author_id');
    }

    public function primaryContactForFirms()
    {
        return $this->hasMany(Firm::class, 'primary_contact_id');
    }

    public function assignedRequirements()
    {
        return $this->hasMany(Requirement::class, 'assigned_user_id');
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function isSuperadmin()
    {
        return $this->role === 'superadmin';
    }

    public function isUser()
    {
        return $this->role === 'user';
    }

    public function hasManagementAccess()
    {
        return $this->role === 'superadmin';
    }

    public function hasProjectEditAccess()
    {
        return $this->role === 'superadmin';
    }

    public function canAccessFirm($firmId)
    {
        if ($this->isSuperadmin()) {
            return true;
        }
        
        return $this->firm_id == $firmId;
    }

    public function canAccessProject($project)
    {
        if ($this->isSuperadmin()) {
            return true;
        }
        
        return $project->firms()->where('firm_id', $this->firm_id)->exists();
    }

    public function canManageUser($user)
    {
        if ($this->isSuperadmin()) {
            return true;
        }
        
        return $this->firm_id == $user->firm_id;
    }
}
