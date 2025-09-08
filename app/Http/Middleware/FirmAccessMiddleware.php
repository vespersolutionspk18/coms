<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class FirmAccessMiddleware
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

        // Superadmins can access everything
        if ($user->isSuperadmin()) {
            return $next($request);
        }

        // Check if user has a firm assigned
        if (!$user->firm_id) {
            abort(403, 'Access denied: No firm assigned to your account.');
        }

        // For firm-specific routes, check access
        $firm = $request->route('firm');
        if ($firm) {
            $firmId = is_object($firm) ? $firm->id : $firm;
            if (!$user->canAccessFirm($firmId)) {
                abort(403, 'Access denied: You can only access your own firm.');
            }
        }

        return $next($request);
    }
}
