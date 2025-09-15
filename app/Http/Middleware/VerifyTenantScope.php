<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;
use App\Services\AuditService;

class VerifyTenantScope
{
    /**
     * Handle an incoming request.
     * This middleware verifies that tenant scoping is properly applied
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        // Skip for non-authenticated requests
        if (!$user) {
            return $next($request);
        }
        
        // In development/testing, verify scopes are applied
        if (app()->environment(['local', 'testing'])) {
            $this->verifyModelScopes();
        }
        
        // Add tenant context to logs
        Log::withContext([
            'user_id' => $user->id,
            'firm_id' => $user->firm_id,
            'is_superadmin' => $user->isSuperadmin(),
            'request_id' => $request->header('X-Request-ID', uniqid()),
        ]);
        
        $response = $next($request);
        
        // After response, verify no cross-tenant data leaked
        if (app()->environment(['local', 'testing'])) {
            $this->verifyResponseData($response, $user);
        }
        
        return $response;
    }
    
    /**
     * Verify that models have proper scopes applied
     */
    protected function verifyModelScopes(): void
    {
        $modelsToCheck = [
            \App\Models\Project::class,
            \App\Models\Task::class,
            \App\Models\Requirement::class,
            \App\Models\Document::class,
            \App\Models\Milestone::class,
        ];
        
        foreach ($modelsToCheck as $modelClass) {
            $model = new $modelClass;
            $scopes = $model->getGlobalScopes();
            
            if (!array_key_exists('tenant', $scopes)) {
                Log::error("Model {$modelClass} is missing tenant scope!", [
                    'model' => $modelClass,
                    'scopes' => array_keys($scopes),
                ]);
                
                // In production, this would alert but not break
                if (app()->environment('production')) {
                    AuditService::log('missing_tenant_scope', null, [
                        'model' => $modelClass,
                        'alert' => 'critical',
                    ]);
                }
            }
        }
    }
    
    /**
     * Verify response doesn't contain cross-tenant data
     */
    protected function verifyResponseData(Response $response, $user): void
    {
        // Skip for superadmins as they can access all data
        if ($user->isSuperadmin()) {
            return;
        }
        
        // Only check JSON responses
        if (!method_exists($response, 'getData')) {
            return;
        }
        
        try {
            $data = $response->getData(true);
            $this->checkDataForCrossTenantLeak($data, $user);
        } catch (\Exception $e) {
            // Log but don't break the response
            Log::warning('Could not verify response data for tenant leaks', [
                'error' => $e->getMessage(),
            ]);
        }
    }
    
    /**
     * Recursively check data for cross-tenant leaks
     */
    protected function checkDataForCrossTenantLeak($data, $user): void
    {
        if (!is_array($data) && !is_object($data)) {
            return;
        }
        
        foreach ($data as $key => $value) {
            // Check for firm_id fields
            if ($key === 'firm_id' && $value !== null && $value != $user->firm_id) {
                Log::error('Potential cross-tenant data leak detected!', [
                    'user_firm' => $user->firm_id,
                    'data_firm' => $value,
                    'user_id' => $user->id,
                ]);
                
                AuditService::log('potential_data_leak', null, [
                    'user_firm' => $user->firm_id,
                    'exposed_firm' => $value,
                ]);
            }
            
            // Recursively check nested data
            if (is_array($value) || is_object($value)) {
                $this->checkDataForCrossTenantLeak($value, $user);
            }
        }
    }
}