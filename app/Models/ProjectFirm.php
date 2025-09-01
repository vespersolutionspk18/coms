<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProjectFirm extends Pivot
{
    protected $table = 'project_firms';

    protected $fillable = [
        'project_id',
        'firm_id',
        'role_in_project',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function firm()
    {
        return $this->belongsTo(Firm::class);
    }
}