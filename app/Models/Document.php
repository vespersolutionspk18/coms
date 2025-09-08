<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'file_path',
        'parsed_text',
        'uploaded_by',
        'tags',
        'firm_id',
        'project_id',
        'requirement_id',
        'task_id',
        'version',
        'status',
    ];

    protected $casts = [
        'tags' => 'array',
    ];

    public function uploadedBy()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function firm()
    {
        return $this->belongsTo(Firm::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function requirement()
    {
        return $this->belongsTo(Requirement::class);
    }

    public function task()
    {
        return $this->belongsTo(Task::class);
    }

    public function requirements()
    {
        return $this->belongsToMany(Requirement::class, 'document_requirement')
            ->withTimestamps();
    }

    public function tasks()
    {
        return $this->belongsToMany(Task::class, 'document_task')
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