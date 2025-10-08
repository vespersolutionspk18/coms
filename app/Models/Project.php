<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;
use Illuminate\Support\Facades\Storage;

class Project extends Model
{
    use HasFactory, BelongsToTenant;

    protected static function boot()
    {
        parent::boot();

        static::deleting(function ($project) {
            // Delete advertisement image file
            if ($project->advertisement && Storage::exists($project->advertisement)) {
                Storage::delete($project->advertisement);
            }

            // Get IDs of all related entities that will be cascade deleted
            $requirementIds = $project->requirements()->pluck('id')->toArray();
            $taskIds = $project->tasks()->pluck('id')->toArray();

            // Get ALL documents that will be cascade deleted:
            // 1. Documents linked to project directly
            // 2. Documents linked to requirements
            // 3. Documents linked to tasks
            $documentQuery = Document::where('project_id', $project->id);

            if (!empty($requirementIds)) {
                $documentQuery->orWhereIn('requirement_id', $requirementIds);
            }

            if (!empty($taskIds)) {
                $documentQuery->orWhereIn('task_id', $taskIds);
            }

            $documentIds = $documentQuery->pluck('id')->toArray();

            // Delete all document files from storage (must happen before cascade delete)
            $documentsToDelete = Document::whereIn('id', $documentIds)->get();
            foreach ($documentsToDelete as $document) {
                if ($document->file_path && Storage::exists($document->file_path)) {
                    Storage::delete($document->file_path);
                }
            }

            // Delete comments for project and all related entities (polymorphic, no FK cascade)
            Comment::where('related_to_type', 'Project')
                   ->where('related_to_id', $project->id)
                   ->delete();

            if (!empty($requirementIds)) {
                Comment::where('related_to_type', 'Requirement')
                       ->whereIn('related_to_id', $requirementIds)
                       ->delete();
            }

            if (!empty($taskIds)) {
                Comment::where('related_to_type', 'Task')
                       ->whereIn('related_to_id', $taskIds)
                       ->delete();
            }

            if (!empty($documentIds)) {
                Comment::where('related_to_type', 'Document')
                       ->whereIn('related_to_id', $documentIds)
                       ->delete();
            }

            // Delete AI metadata for project and all related entities (polymorphic, no FK cascade)
            AiMetadata::where('entity_type', 'Project')
                      ->where('entity_id', $project->id)
                      ->delete();

            if (!empty($requirementIds)) {
                AiMetadata::where('entity_type', 'Requirement')
                          ->whereIn('entity_id', $requirementIds)
                          ->delete();
            }

            if (!empty($taskIds)) {
                AiMetadata::where('entity_type', 'Task')
                          ->whereIn('entity_id', $taskIds)
                          ->delete();
            }

            if (!empty($documentIds)) {
                AiMetadata::where('entity_type', 'Document')
                          ->whereIn('entity_id', $documentIds)
                          ->delete();
            }

            // Everything else will cascade delete at database level:
            // - documents (with FK cascade)
            // - requirements (with FK cascade)
            // - tasks (with FK cascade)
            // - milestones (with FK cascade)
            // - notifications (with FK cascade)
            // - project_firms (with FK cascade, unlinking firms)
        });
    }

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