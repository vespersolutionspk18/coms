<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'sector',
        'scope_of_work',
        'client',
        'stage',
        'submission_date',
        'bid_security',
        'status',
        'pre_bid_expected_date',
        'advertisement',
        'ai_metadata',
    ];

    protected $casts = [
        'scope_of_work' => 'array',
        'ai_metadata' => 'array',
        'submission_date' => 'date',
        'pre_bid_expected_date' => 'date',
    ];

    public function requirements()
    {
        return $this->hasMany(Requirement::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function firms()
    {
        return $this->belongsToMany(Firm::class, 'project_firms')
            ->withPivot('role_in_project')
            ->withTimestamps();
    }

    public function milestones()
    {
        return $this->hasMany(Milestone::class);
    }

    public function comments()
    {
        return $this->morphMany(Comment::class, 'related_to');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function aiMetadata()
    {
        return $this->morphMany(AiMetadata::class, 'entity');
    }
}