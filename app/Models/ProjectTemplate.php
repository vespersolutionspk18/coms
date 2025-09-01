<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProjectTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'default_requirements',
        'default_tasks',
    ];

    protected $casts = [
        'default_requirements' => 'array',
        'default_tasks' => 'array',
    ];
}