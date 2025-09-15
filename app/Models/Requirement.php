<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

class Requirement extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'project_id',
        'type',
        'title',
        'description',
        'priority',
        'assigned_firm_id',
        'assigned_user_id',
        'status',
        'dependency_id',
        'ai_metadata',
    ];

    protected $casts = [
        'ai_metadata' => 'array',
    ];

    public function setTypeAttribute($value)
    {
        // Simply store the type as-is, allowing any type of requirement
        // Normalize to title case for consistency
        $this->attributes['type'] = ucfirst(strtolower(trim($value)));
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function assignedFirm()
    {
        return $this->belongsTo(Firm::class, 'assigned_firm_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function dependency()
    {
        return $this->belongsTo(Requirement::class, 'dependency_id');
    }

    public function dependents()
    {
        return $this->hasMany(Requirement::class, 'dependency_id');
    }

    public function documents()
    {
        return $this->belongsToMany(Document::class, 'document_requirement')
            ->withTimestamps();
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function milestones()
    {
        return $this->belongsToMany(Milestone::class, 'milestone_requirement')
            ->withTimestamps();
    }

    public function comments()
    {
        return $this->morphMany(Comment::class, 'related_to');
    }

    public function aiMetadata()
    {
        return $this->morphMany(AiMetadata::class, 'entity');
    }
}