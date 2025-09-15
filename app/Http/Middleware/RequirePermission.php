<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\RolePermissionService;
use App\Services\AuditService;

class RequirePermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $permission  The required permission
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return redirect()->route('login');
        }
        
        // Check if user has the required permission
        if (!RolePermissionService::hasPermission($user, $permission)) {
            // Log the failed attempt
            AuditService::log('permission_denied', null, [
                'permission' => $permission,
                'user_role' => $user->role,
                'url' => $request->fullUrl(),
                'method' => $request->method(),
            ]);
            
            abort(403, "Access denied: You do not have the '{$permission}' permission.");
        }
        
        return $next($request);
    }
}