<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\AuditService;

class RequireRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles  The required roles (user must have at least one)
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return redirect()->route('login');
        }
        
        // Check if user has any of the required roles
        if (!in_array($user->role, $roles)) {
            // Log the failed attempt
            AuditService::log('role_access_denied', null, [
                'required_roles' => $roles,
                'user_role' => $user->role,
                'url' => $request->fullUrl(),
                'method' => $request->method(),
            ]);
            
            $roleList = implode(', ', $roles);
            abort(403, "Access denied: This action requires one of the following roles: {$roleList}");
        }
        
        return $next($request);
    }
}