<?php

namespace App\Services;

use App\Models\User;
use App\Enums\UserRole;

class RolePermissionService
{
    /**
     * Define all permissions in the system
     */
    const PERMISSIONS = [
        // User Management
        'users.view.all' => 'View all users across firms',
        'users.view.own_firm' => 'View users in own firm',
        'users.create' => 'Create new users',
        'users.edit.all' => 'Edit any user',
        'users.edit.own_firm' => 'Edit users in own firm',
        'users.delete' => 'Delete users',
        'users.change_role' => 'Change user roles',
        
        // Firm Management
        'firms.view.all' => 'View all firms',
        'firms.view.own' => 'View own firm',
        'firms.create' => 'Create new firms',
        'firms.edit.all' => 'Edit any firm',
        'firms.edit.own' => 'Edit own firm',
        'firms.delete' => 'Delete firms',
        
        // Project Management
        'projects.view.all' => 'View all projects',
        'projects.view.own_firm' => 'View projects involving own firm',
        'projects.create' => 'Create new projects',
        'projects.edit.all' => 'Edit any project',
        'projects.edit.own_firm' => 'Edit projects involving own firm',
        'projects.delete' => 'Delete projects',
        'projects.manage_firms' => 'Add/remove firms from projects',
        
        // Requirements Management
        'requirements.view' => 'View requirements',
        'requirements.create' => 'Create requirements',
        'requirements.edit' => 'Edit requirements',
        'requirements.delete' => 'Delete requirements',
        'requirements.assign' => 'Assign requirements to users/firms',
        
        // Task Management
        'tasks.view' => 'View tasks',
        'tasks.create' => 'Create tasks',
        'tasks.edit.all' => 'Edit any task',
        'tasks.edit.assigned' => 'Edit assigned tasks',
        'tasks.delete' => 'Delete tasks',
        'tasks.assign' => 'Assign tasks to users/firms',
        
        // Document Management
        'documents.view.all' => 'View all documents',
        'documents.view.own_firm' => 'View own firm documents',
        'documents.upload' => 'Upload documents',
        'documents.edit' => 'Edit document metadata',
        'documents.delete' => 'Delete documents',
        'documents.download' => 'Download documents',
        
        // System Administration
        'system.view_audit_logs' => 'View audit logs',
        'system.view_analytics' => 'View system analytics',
        'system.manage_settings' => 'Manage system settings',
        'system.bypass_tenant' => 'Bypass tenant restrictions',
        'system.impersonate' => 'Impersonate other users',
    ];
    
    /**
     * Define role-permission mappings
     */
    const ROLE_PERMISSIONS = [
        UserRole::SUPERADMIN => [
            '*', // All permissions
        ],
        
        UserRole::USER => [
            // User viewing
            'users.view.own_firm',
            
            // Firm viewing
            'firms.view.own',
            
            // Project viewing and editing
            'projects.view.own_firm',
            'projects.edit.own_firm',
            
            // Requirements
            'requirements.view',
            'requirements.create',
            'requirements.edit',
            
            // Tasks
            'tasks.view',
            'tasks.create',
            'tasks.edit.assigned',
            
            // Documents
            'documents.view.own_firm',
            'documents.upload',
            'documents.download',
        ],
    ];
    
    /**
     * Check if a user has a specific permission
     */
    public static function hasPermission(User $user, string $permission): bool
    {
        $rolePermissions = self::getRolePermissions($user->role);
        
        // Check for wildcard permissions
        if (in_array('*', $rolePermissions)) {
            return true;
        }
        
        // Check for exact permission
        if (in_array($permission, $rolePermissions)) {
            return true;
        }
        
        // Check for wildcard in permission category
        $permissionParts = explode('.', $permission);
        if (count($permissionParts) > 1) {
            $category = $permissionParts[0];
            if (in_array($category . '.*', $rolePermissions)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get all permissions for a role
     */
    public static function getRolePermissions(string $role): array
    {
        if (!isset(self::ROLE_PERMISSIONS[$role])) {
            return [];
        }
        
        $permissions = self::ROLE_PERMISSIONS[$role];
        
        // Expand wildcards
        $expanded = [];
        foreach ($permissions as $permission) {
            if ($permission === '*') {
                return array_keys(self::PERMISSIONS);
            }
            
            if (str_ends_with($permission, '.*')) {
                $prefix = substr($permission, 0, -2);
                foreach (self::PERMISSIONS as $key => $description) {
                    if (str_starts_with($key, $prefix . '.')) {
                        $expanded[] = $key;
                    }
                }
            } else {
                $expanded[] = $permission;
            }
        }
        
        return array_unique($expanded);
    }
    
    /**
     * Check if a user can perform an action on a resource
     */
    public static function can(User $user, string $action, $resource = null): bool
    {
        // First check permission
        if (!self::hasPermission($user, $action)) {
            return false;
        }
        
        // Then check resource-specific access if provided
        if ($resource && method_exists($resource, 'userCanAccess')) {
            return $resource->userCanAccess($user);
        }
        
        return true;
    }
    
    /**
     * Get human-readable permission description
     */
    public static function getPermissionDescription(string $permission): string
    {
        return self::PERMISSIONS[$permission] ?? $permission;
    }
    
    /**
     * Check if user can assign a specific role
     */
    public static function canAssignRole(User $assigner, string $roleToAssign): bool
    {
        // Must have permission to change roles
        if (!self::hasPermission($assigner, 'users.change_role')) {
            return false;
        }
        
        // Superadmins can assign any role
        if ($assigner->role === UserRole::SUPERADMIN) {
            return true;
        }
        
        // Define role hierarchy (higher number = higher privilege)
        $hierarchy = [
            UserRole::USER => 1,
            UserRole::JV_PARTNER => 2,
            UserRole::CONSULTANT => 3,
            UserRole::BUSINESS_DEVELOPMENT => 4,
            UserRole::ADMIN => 5,
            UserRole::SUPERADMIN => 6,
        ];
        
        $assignerLevel = $hierarchy[$assigner->role] ?? 0;
        $targetLevel = $hierarchy[$roleToAssign] ?? 0;
        
        // Can only assign roles below their own level
        return $targetLevel < $assignerLevel;
    }
    
    /**
     * Get roles that a user can assign
     */
    public static function getAssignableRoles(User $user): array
    {
        if (!self::hasPermission($user, 'users.change_role')) {
            return [];
        }
        
        $allRoles = UserRole::all();
        $assignable = [];
        
        foreach ($allRoles as $role) {
            if (self::canAssignRole($user, $role)) {
                $assignable[] = $role;
            }
        }
        
        return $assignable;
    }
}