<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

class Milestone extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'project_id',
        'title',
        'description',
        'due_date',
        'status',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function requirements()
    {
        return $this->belongsToMany(Requirement::class, 'milestone_requirement')
            ->withTimestamps();
    }
}