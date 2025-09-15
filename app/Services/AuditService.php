<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Model;

class AuditService
{
    /**
     * Log an action performed by a user
     */
    public static function log(string $action, ?Model $entity = null, array $metadata = []): void
    {
        $user = auth()->user();
        $request = request();
        
        if (!$user) {
            return;
        }
        
        // Always log superadmin actions
        $shouldLog = $user->isSuperadmin();
        
        // Also log certain sensitive actions regardless of role
        $sensitiveActions = [
            'role_change',
            'user_delete',
            'firm_delete',
            'project_delete',
            'cross_tenant_access',
            'permission_override'
        ];
        
        if (in_array($action, $sensitiveActions)) {
            $shouldLog = true;
        }
        
        if (!$shouldLog) {
            return;
        }
        
        // Prepare audit data
        $auditData = [
            'user_id' => $user->id,
            'action_type' => $action,
            'entity_type' => $entity ? class_basename($entity) : null,
            'entity_id' => $entity ? $entity->id : null,
            'metadata' => array_merge($metadata, [
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'is_superadmin' => $user->isSuperadmin(),
                'user_firm_id' => $user->firm_id,
            ]),
            'timestamp' => now(),
        ];
        
        // Store in database
        try {
            AuditLog::create($auditData);
        } catch (\Exception $e) {
            // If database logging fails, at least log to file
            Log::error('Failed to create audit log entry', [
                'error' => $e->getMessage(),
                'audit_data' => $auditData
            ]);
        }
        
        // Also log to file for superadmin actions
        if ($user->isSuperadmin()) {
            Log::channel('superadmin')->info("Superadmin action: {$action}", $auditData);
        }
    }
    
    /**
     * Log a cross-tenant access attempt
     */
    public static function logCrossTenantAccess(Model $resource, string $action, bool $allowed = false): void
    {
        $user = auth()->user();
        if (!$user) return;
        
        $metadata = [
            'resource_type' => class_basename($resource),
            'resource_id' => $resource->id,
            'action_attempted' => $action,
            'access_allowed' => $allowed,
            'user_firm_id' => $user->firm_id,
        ];
        
        // Add resource firm if available
        if (property_exists($resource, 'firm_id')) {
            $metadata['resource_firm_id'] = $resource->firm_id;
        }
        
        self::log('cross_tenant_access', $resource, $metadata);
        
        // Also log to security channel for monitoring
        Log::channel('security')->warning('Cross-tenant access attempt', $metadata);
    }
    
    /**
     * Log permission override by superadmin
     */
    public static function logPermissionOverride(string $action, ?Model $resource = null, array $details = []): void
    {
        $user = auth()->user();
        if (!$user || !$user->isSuperadmin()) return;
        
        self::log('permission_override', $resource, array_merge([
            'override_action' => $action,
            'override_details' => $details,
        ], $details));
    }
}