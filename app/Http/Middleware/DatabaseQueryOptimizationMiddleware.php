<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class DatabaseQueryOptimizationMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Enable query log in development
        if (config('app.debug')) {
            DB::enableQueryLog();
        }
        
        $response = $next($request);
        
        // Log slow queries and N+1 problems in development
        if (config('app.debug')) {
            $queries = DB::getQueryLog();
            
            // Check for slow queries (> 100ms)
            $slowQueries = array_filter($queries, function($query) {
                return $query['time'] > 100;
            });
            
            if (count($slowQueries) > 0) {
                Log::warning('Slow queries detected', [
                    'url' => $request->fullUrl(),
                    'queries' => $slowQueries
                ]);
            }
            
            // Check for potential N+1 problems
            $queryCount = count($queries);
            if ($queryCount > 50) {
                Log::warning('Potential N+1 problem detected', [
                    'url' => $request->fullUrl(),
                    'query_count' => $queryCount
                ]);
            }
            
            // Add debug headers in development
            $response->headers->set('X-DB-Query-Count', $queryCount);
            $response->headers->set('X-DB-Query-Time', array_sum(array_column($queries, 'time')) . 'ms');
        }
        
        return $response;
    }
}