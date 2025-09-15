<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use App\Models\User;
use App\Models\Project;

trait BelongsToTenant
{
    /**
     * Boot the trait and add global scope for tenant filtering
     */
    protected static function bootBelongsToTenant()
    {
        // Add global scope to automatically filter by tenant
        static::addGlobalScope('tenant', function (Builder $builder) {
            $user = auth()->user();
            
            if (!$user) {
                // No user, no results (for safety)
                $builder->whereRaw('1 = 0');
                return;
            }
            
            // Superadmins see everything
            if ($user->isSuperadmin()) {
                return;
            }
            
            // Apply tenant filtering based on the model
            $model = $builder->getModel();
            
            if ($model instanceof User) {
                // Users can only see users from their firm
                $builder->where('firm_id', $user->firm_id);
            } elseif ($model instanceof Project) {
                // Users can only see projects their firm is involved in
                $builder->whereHas('firms', function ($query) use ($user) {
                    $query->where('firms.id', $user->firm_id);
                });
            } elseif (method_exists($model, 'project')) {
                // For models with project relationship (tasks, requirements, etc.)
                $builder->whereHas('project', function ($query) use ($user) {
                    $query->whereHas('firms', function ($q) use ($user) {
                        $q->where('firms.id', $user->firm_id);
                    });
                });
            } elseif (method_exists($model, 'firm')) {
                // For models with direct firm relationship
                $builder->where('firm_id', $user->firm_id);
            }
        });
        
        // Automatically set firm_id on creation if the model has it
        static::creating(function ($model) {
            $user = auth()->user();
            
            if ($user && !$user->isSuperadmin() && 
                property_exists($model, 'fillable') && 
                in_array('firm_id', $model->fillable) &&
                !$model->firm_id) {
                $model->firm_id = $user->firm_id;
            }
        });
    }
    
    /**
     * Scope to bypass tenant filtering (for superadmin use)
     */
    public function scopeWithoutTenantScope(Builder $query): Builder
    {
        return $query->withoutGlobalScope('tenant');
    }
    
    /**
     * Check if current user can access this model instance
     */
    public function userCanAccess(?User $user = null): bool
    {
        $user = $user ?? auth()->user();
        
        if (!$user) {
            return false;
        }
        
        // Superadmins can access everything
        if ($user->isSuperadmin()) {
            return true;
        }
        
        // Check based on model type
        if ($this instanceof User) {
            return $this->firm_id === $user->firm_id;
        }
        
        if ($this instanceof Project) {
            return $this->firms()->where('firms.id', $user->firm_id)->exists();
        }
        
        // For models with project relationship
        if (method_exists($this, 'project') && $this->project) {
            return $this->project->firms()->where('firms.id', $user->firm_id)->exists();
        }
        
        // For models with direct firm relationship
        if (property_exists($this, 'firm_id') && $this->firm_id) {
            return $this->firm_id === $user->firm_id;
        }
        
        return false;
    }
}