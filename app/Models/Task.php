<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'requirement_id',
        'title',
        'description',
        'assigned_user_id',
        'assigned_firm_id',
        'due_date',
        'status',
        'priority',
        'parent_task_id',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function requirement()
    {
        return $this->belongsTo(Requirement::class);
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function assignedFirm()
    {
        return $this->belongsTo(Firm::class, 'assigned_firm_id');
    }

    public function parentTask()
    {
        return $this->belongsTo(Task::class, 'parent_task_id');
    }

    public function subtasks()
    {
        return $this->hasMany(Task::class, 'parent_task_id');
    }

    public function documents()
    {
        return $this->belongsToMany(Document::class, 'document_task')
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