<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Project;
use App\Models\Task;
use App\Models\Document;
use App\Models\Requirement;
use App\Models\Milestone;
use App\Models\Firm;
use Illuminate\Support\Facades\DB;
use App\Services\AuditService;

class VerifyTenantIsolation extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tenant:verify {--fix : Attempt to fix issues found}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verify tenant isolation integrity and check for data leaks';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting tenant isolation verification...');
        
        $issues = [];
        
        // Check 1: Users without firms
        $this->info('Checking for users without firms...');
        $usersWithoutFirms = User::withoutTenantScope()
            ->whereNull('firm_id')
            ->where('role', '!=', 'superadmin')
            ->count();
        
        if ($usersWithoutFirms > 0) {
            $issues[] = "Found {$usersWithoutFirms} non-superadmin users without firm assignment";
            $this->error("❌ Found {$usersWithoutFirms} users without firm assignment");
            
            if ($this->option('fix')) {
                $this->warn('Cannot auto-fix users without firms - manual assignment required');
            }
        } else {
            $this->info('✅ All users have firm assignments');
        }
        
        // Check 2: Orphaned projects (projects with no firm associations)
        $this->info('Checking for orphaned projects...');
        $orphanedProjects = Project::withoutTenantScope()
            ->doesntHave('firms')
            ->count();
        
        if ($orphanedProjects > 0) {
            $issues[] = "Found {$orphanedProjects} projects with no firm associations";
            $this->error("❌ Found {$orphanedProjects} orphaned projects");
            
            if ($this->option('fix')) {
                $this->warn('Cannot auto-fix orphaned projects - manual review required');
            }
        } else {
            $this->info('✅ All projects have firm associations');
        }
        
        // Check 3: Tasks without valid projects
        $this->info('Checking for tasks with invalid projects...');
        $invalidTasks = Task::withoutTenantScope()
            ->whereNotIn('project_id', Project::withoutTenantScope()->pluck('id'))
            ->count();
        
        if ($invalidTasks > 0) {
            $issues[] = "Found {$invalidTasks} tasks with invalid project references";
            $this->error("❌ Found {$invalidTasks} tasks with invalid projects");
            
            if ($this->option('fix')) {
                Task::withoutTenantScope()
                    ->whereNotIn('project_id', Project::withoutTenantScope()->pluck('id'))
                    ->delete();
                $this->info('Deleted orphaned tasks');
            }
        } else {
            $this->info('✅ All tasks have valid projects');
        }
        
        // Check 4: Cross-tenant document assignments
        $this->info('Checking for cross-tenant document assignments...');
        $crossTenantDocs = DB::table('documents as d')
            ->join('projects as p', 'd.project_id', '=', 'p.id')
            ->leftJoin('project_firms as pf', function($join) {
                $join->on('p.id', '=', 'pf.project_id')
                     ->on('d.firm_id', '=', 'pf.firm_id');
            })
            ->whereNotNull('d.firm_id')
            ->whereNotNull('d.project_id')
            ->whereNull('pf.id')
            ->count();
        
        if ($crossTenantDocs > 0) {
            $issues[] = "Found {$crossTenantDocs} documents assigned to projects their firm doesn't have access to";
            $this->error("❌ Found {$crossTenantDocs} cross-tenant document assignments");
        } else {
            $this->info('✅ All documents are properly assigned');
        }
        
        // Check 5: Verify global scopes are applied
        $this->info('Checking global scope application...');
        $modelsToCheck = [
            Project::class => 'Projects',
            Task::class => 'Tasks',
            Requirement::class => 'Requirements',
            Document::class => 'Documents',
            Milestone::class => 'Milestones',
        ];
        
        foreach ($modelsToCheck as $modelClass => $name) {
            $model = new $modelClass;
            $scopes = $model->getGlobalScopes();
            
            if (!array_key_exists('tenant', $scopes)) {
                $issues[] = "{$name} model is missing tenant global scope";
                $this->error("❌ {$name} missing tenant scope");
            } else {
                $this->info("✅ {$name} has tenant scope");
            }
        }
        
        // Check 6: Test actual isolation
        $this->info('Testing actual tenant isolation...');
        $firms = Firm::withoutTenantScope()->limit(2)->get();
        
        if ($firms->count() >= 2) {
            $firm1 = $firms[0];
            $firm2 = $firms[1];
            
            $user1 = User::withoutTenantScope()->where('firm_id', $firm1->id)->first();
            $user2 = User::withoutTenantScope()->where('firm_id', $firm2->id)->first();
            
            if ($user1 && $user2) {
                // Simulate user1 context
                auth()->setUser($user1);
                $user1Projects = Project::count();
                
                // Simulate user2 context
                auth()->setUser($user2);
                $user2Projects = Project::count();
                
                // Check if they see different projects
                $totalProjects = Project::withoutTenantScope()->count();
                
                if ($user1Projects == $totalProjects || $user2Projects == $totalProjects) {
                    $issues[] = "Tenant isolation may not be working - users see all projects";
                    $this->error("❌ Users may be seeing all projects!");
                } else {
                    $this->info("✅ Tenant isolation is working");
                }
                
                auth()->logout();
            }
        }
        
        // Summary
        $this->newLine();
        if (empty($issues)) {
            $this->info('🎉 All tenant isolation checks passed!');
        } else {
            $this->error('⚠️  Found ' . count($issues) . ' issues:');
            foreach ($issues as $issue) {
                $this->line("  - {$issue}");
            }
            
            // Log to audit
            AuditService::log('tenant_verification_failed', null, [
                'issues' => $issues,
                'fixed' => $this->option('fix'),
            ]);
        }
        
        return empty($issues) ? Command::SUCCESS : Command::FAILURE;
    }
}