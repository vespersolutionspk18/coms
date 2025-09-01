<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Firm extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'primary_contact_id',
        'contact_email',
        'contact_phone',
        'address',
        'status',
        'notes',
        'rating',
        'ai_metadata',
    ];

    protected $casts = [
        'ai_metadata' => 'array',
        'rating' => 'decimal:1',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function primaryContact()
    {
        return $this->belongsTo(User::class, 'primary_contact_id');
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function projects()
    {
        return $this->belongsToMany(Project::class, 'project_firms')
            ->withPivot('role_in_project')
            ->withTimestamps();
    }

    public function assignedRequirements()
    {
        return $this->hasMany(Requirement::class, 'assigned_firm_id');
    }

    public function assignedTasks()
    {
        return $this->hasMany(Task::class, 'assigned_firm_id');
    }
}