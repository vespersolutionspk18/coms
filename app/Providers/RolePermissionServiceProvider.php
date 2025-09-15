<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use App\Services\RolePermissionService;
use App\Models\User;

class RolePermissionServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Register all permissions as Gates
        foreach (RolePermissionService::PERMISSIONS as $permission => $description) {
            Gate::define($permission, function (User $user) use ($permission) {
                return RolePermissionService::hasPermission($user, $permission);
            });
        }
        
        // Register special gates for common checks
        Gate::define('manage-users', function (User $user) {
            return RolePermissionService::hasPermission($user, 'users.create') ||
                   RolePermissionService::hasPermission($user, 'users.edit.all') ||
                   RolePermissionService::hasPermission($user, 'users.edit.own_firm');
        });
        
        Gate::define('manage-projects', function (User $user) {
            return RolePermissionService::hasPermission($user, 'projects.create') ||
                   RolePermissionService::hasPermission($user, 'projects.edit.all') ||
                   RolePermissionService::hasPermission($user, 'projects.edit.own_firm');
        });
        
        Gate::define('manage-firms', function (User $user) {
            return RolePermissionService::hasPermission($user, 'firms.create') ||
                   RolePermissionService::hasPermission($user, 'firms.edit.all');
        });
        
        // Gate for checking if user can access a specific resource
        Gate::define('access-resource', function (User $user, $resource) {
            if (method_exists($resource, 'userCanAccess')) {
                return $resource->userCanAccess($user);
            }
            return false;
        });
        
        // Gate for role assignment
        Gate::define('assign-role', function (User $user, string $role) {
            return RolePermissionService::canAssignRole($user, $role);
        });
        
        // Before callback - superadmins bypass all checks
        Gate::before(function (User $user, string $ability) {
            if ($user->isSuperadmin()) {
                // Log superadmin gate bypasses for sensitive operations
                if (in_array($ability, ['users.delete', 'firms.delete', 'system.impersonate'])) {
                    \App\Services\AuditService::logPermissionOverride($ability, null, [
                        'gate_bypass' => true,
                        'user_id' => $user->id,
                    ]);
                }
                return true;
            }
        });
    }
}