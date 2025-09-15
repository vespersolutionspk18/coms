<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

class Project extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'title',
        'sector',
        'scope_of_work',
        'client',
        'client_email',
        'client_phone',
        'documents_procurement',
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
            ->withPivot('role_in_project', 'selected_documents')
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

    /**
     * Check if a user can attach a firm to this project
     */
    public function canAttachFirm($firmId, $user)
    {
        // Superadmins can attach any firm
        if ($user->isSuperadmin()) {
            return true;
        }

        // Check if the firm is already attached to the project
        if ($this->firms()->where('firms.id', $firmId)->exists()) {
            return true;
        }

        // Users can only attach their own firm
        return $user->firm_id == $firmId;
    }

    /**
     * Check if a user can attach a specific user to this project
     */
    public function canAssignUser($targetUserId, $user)
    {
        // Superadmins can assign any user
        if ($user->isSuperadmin()) {
            return true;
        }

        $targetUser = User::find($targetUserId);
        if (!$targetUser) {
            return false;
        }

        // Check if the target user's firm has access to this project
        return $this->firms()->where('firms.id', $targetUser->firm_id)->exists();
    }

    /**
     * Validate that a document belongs to the specified firm
     */
    public static function validateDocumentOwnership($documentId, $firmId)
    {
        $document = Document::find($documentId);
        return $document && $document->firm_id == $firmId;
    }
}