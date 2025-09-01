<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Comment extends Model
{
    use HasFactory;

    protected $fillable = [
        'content',
        'author_id',
        'related_to_type',
        'related_to_id',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function relatedTo()
    {
        if ($this->related_to_type === 'Task') {
            return $this->belongsTo(Task::class, 'related_to_id');
        } elseif ($this->related_to_type === 'Document') {
            return $this->belongsTo(Document::class, 'related_to_id');
        } elseif ($this->related_to_type === 'Requirement') {
            return $this->belongsTo(Requirement::class, 'related_to_id');
        } elseif ($this->related_to_type === 'Project') {
            return $this->belongsTo(Project::class, 'related_to_id');
        }
        return null;
    }
}