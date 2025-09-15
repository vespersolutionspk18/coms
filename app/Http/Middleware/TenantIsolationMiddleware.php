<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\Task;
use App\Models\Document;
use App\Models\Milestone;
use App\Models\Firm;
use App\Models\User;
use App\Services\AuditService;

class TenantIsolationMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return redirect()->route('login');
        }

        // Superadmins bypass all tenant checks but log their actions
        if ($user->isSuperadmin()) {
            // Log superadmin access to resources outside their firm
            $this->logSuperadminAccess($request);
            return $next($request);
        }

        // Check if user has a firm assigned
        if (!$user->firm_id) {
            abort(403, 'Access denied: No firm assigned to your account.');
        }

        // Extract resource parameters from the route
        $routeParams = $request->route()->parameters();
        
        // Check access for each resource type
        foreach ($routeParams as $key => $value) {
            if (!$this->checkResourceAccess($key, $value, $user)) {
                abort(403, 'Access denied: You do not have permission to access this resource.');
            }
        }

        // Additional validation for specific actions
        $this->validateRequestData($request, $user);

        return $next($request);
    }

    /**
     * Check if user has access to a specific resource
     */
    protected function checkResourceAccess($resourceType, $resourceId, $user): bool
    {
        // Handle model binding (when Laravel passes the model instance)
        if (is_object($resourceId)) {
            $resourceId = $resourceId->id ?? $resourceId;
        }

        switch ($resourceType) {
            case 'project':
                $project = Project::find($resourceId);
                return $project && $user->canAccessProject($project);
                
            case 'firm':
                return $user->canAccessFirm($resourceId);
                
            case 'user':
                $targetUser = User::find($resourceId);
                return $targetUser && $user->canManageUser($targetUser);
                
            case 'requirement':
                $requirement = Requirement::find($resourceId);
                if (!$requirement) return false;
                $project = Project::find($requirement->project_id);
                return $project && $user->canAccessProject($project);
                
            case 'task':
                $task = Task::find($resourceId);
                if (!$task) return false;
                $project = Project::find($task->project_id);
                return $project && $user->canAccessProject($project);
                
            case 'document':
                $document = Document::find($resourceId);
                if (!$document) return false;
                
                // Check firm access
                if ($document->firm_id && !$user->canAccessFirm($document->firm_id)) {
                    return false;
                }
                
                // Check project access if document is associated with a project
                if ($document->project_id) {
                    $project = Project::find($document->project_id);
                    return $project && $user->canAccessProject($project);
                }
                
                return true;
                
            case 'milestone':
                $milestone = Milestone::find($resourceId);
                if (!$milestone) return false;
                $project = Project::find($milestone->project_id);
                return $project && $user->canAccessProject($project);
                
            default:
                // For unknown resource types, allow access (will be handled by specific controllers)
                return true;
        }
    }

    /**
     * Validate request data for tenant isolation
     */
    protected function validateRequestData(Request $request, $user): void
    {
        // Validate project_id in request
        if ($request->has('project_id')) {
            $project = Project::find($request->input('project_id'));
            if ($project && !$user->canAccessProject($project)) {
                abort(403, 'Access denied: You cannot access this project.');
            }
        }

        // Validate firm_id in request
        if ($request->has('firm_id')) {
            if (!$user->canAccessFirm($request->input('firm_id'))) {
                abort(403, 'Access denied: You cannot access this firm.');
            }
        }

        // Validate assigned_user_id in request
        if ($request->has('assigned_user_id')) {
            $assignedUser = User::find($request->input('assigned_user_id'));
            if ($assignedUser && !$user->canManageUser($assignedUser)) {
                // For assignments, check if the user's firm has access to the context
                if ($request->has('project_id')) {
                    $project = Project::find($request->input('project_id'));
                    if ($project && !$project->firms()->where('firms.id', $assignedUser->firm_id)->exists()) {
                        abort(403, 'Access denied: Assigned user does not have access to this project.');
                    }
                }
            }
        }

        // Validate assigned_firm_id in request
        if ($request->has('assigned_firm_id')) {
            $assignedFirmId = $request->input('assigned_firm_id');
            if ($request->has('project_id')) {
                $project = Project::find($request->input('project_id'));
                if ($project && !$project->firms()->where('firms.id', $assignedFirmId)->exists()) {
                    abort(403, 'Access denied: Assigned firm does not have access to this project.');
                }
            }
        }
    }
    
    /**
     * Log superadmin access to resources
     */
    protected function logSuperadminAccess(Request $request): void
    {
        $routeParams = $request->route()->parameters();
        $action = $request->route()->getActionName();
        
        // Log access to specific resources
        foreach ($routeParams as $key => $value) {
            if (is_object($value)) {
                // Check if this is a cross-tenant access
                if (method_exists($value, 'userCanAccess')) {
                    $user = auth()->user();
                    
                    // Check if accessing resource outside their firm
                    $isCrossTenant = false;
                    
                    if (property_exists($value, 'firm_id') && $value->firm_id !== $user->firm_id) {
                        $isCrossTenant = true;
                    } elseif ($value instanceof Project) {
                        $isCrossTenant = !$value->firms()->where('firms.id', $user->firm_id)->exists();
                    }
                    
                    if ($isCrossTenant) {
                        AuditService::logCrossTenantAccess($value, $action, true);
                    }
                }
                
                // Log the superadmin action
                AuditService::log('superadmin_access', $value, [
                    'route' => $request->route()->getName(),
                    'method' => $request->method(),
                    'resource_type' => $key,
                ]);
            }
        }
    }
}