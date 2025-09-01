<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class AiMetadata extends Model
{
    use HasFactory;

    protected $table = 'ai_metadata';

    protected $fillable = [
        'entity_type',
        'entity_id',
        'suggestion_type',
        'data',
    ];

    protected $casts = [
        'data' => 'array',
    ];
}