<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class ApiOptimizationMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Add performance headers
        $response = $next($request);
        
        // Set caching headers for GET requests
        if ($request->isMethod('GET')) {
            $response->headers->set('Cache-Control', 'private, max-age=60');
            $response->headers->set('Vary', 'Accept-Encoding, Authorization');
            
            // Add ETag support
            $etag = md5($response->getContent());
            $response->headers->set('ETag', $etag);
            
            // Check if client has cached version
            $requestEtag = $request->headers->get('If-None-Match');
            if ($requestEtag === $etag) {
                $response->setStatusCode(304);
                $response->setContent('');
            }
        }
        
        // Add performance timing headers
        if (defined('LARAVEL_START')) {
            $duration = round((microtime(true) - LARAVEL_START) * 1000, 2);
            $response->headers->set('X-Response-Time', $duration . 'ms');
        }
        
        // Add rate limit headers
        $key = 'api_rate_limit:' . $request->ip();
        $requests = Cache::increment($key, 1);
        
        if ($requests === 1) {
            Cache::put($key, 1, now()->addMinute());
        }
        
        $response->headers->set('X-RateLimit-Limit', '60');
        $response->headers->set('X-RateLimit-Remaining', max(0, 60 - $requests));
        $response->headers->set('X-RateLimit-Reset', now()->addMinute()->timestamp);
        
        // Block if rate limit exceeded
        if ($requests > 60) {
            return response()->json([
                'error' => 'Too many requests',
                'retry_after' => 60
            ], 429)->withHeaders([
                'Retry-After' => 60,
                'X-RateLimit-Limit' => '60',
                'X-RateLimit-Remaining' => '0',
                'X-RateLimit-Reset' => now()->addMinute()->timestamp
            ]);
        }
        
        return $response;
    }
}