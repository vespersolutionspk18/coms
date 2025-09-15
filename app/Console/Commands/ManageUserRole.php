<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Enums\UserRole;
use App\Services\RolePermissionService;
use App\Services\AuditService;

class ManageUserRole extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:role 
        {email : The email of the user}
        {role? : The new role to assign}
        {--list : List all available roles}
        {--permissions : Show permissions for the role}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Manage user roles and view role permissions';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // List available roles
        if ($this->option('list')) {
            $this->listRoles();
            return Command::SUCCESS;
        }
        
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            $this->error("User with email {$email} not found.");
            return Command::FAILURE;
        }
        
        // Show current role and permissions
        $this->info("User: {$user->name} ({$user->email})");
        $this->info("Current Role: {$user->role}");
        
        if ($this->option('permissions')) {
            $this->showPermissions($user->role);
        }
        
        // Change role if provided
        $newRole = $this->argument('role');
        if ($newRole) {
            if (!in_array($newRole, UserRole::all())) {
                $this->error("Invalid role: {$newRole}");
                $this->info("Available roles: " . implode(', ', UserRole::all()));
                return Command::FAILURE;
            }
            
            $oldRole = $user->role;
            $user->role = $newRole;
            $user->save();
            
            $this->info("Role changed from {$oldRole} to {$newRole}");
            
            // Log the change
            AuditService::log('role_change_cli', $user, [
                'old_role' => $oldRole,
                'new_role' => $newRole,
                'changed_by' => 'console',
            ]);
            
            if ($this->option('permissions')) {
                $this->showPermissions($newRole);
            }
        }
        
        return Command::SUCCESS;
    }
    
    /**
     * List all available roles
     */
    protected function listRoles(): void
    {
        $this->info('Available Roles:');
        $this->newLine();
        
        $roles = [
            UserRole::SUPERADMIN => 'Full system access, bypass all restrictions',
            UserRole::ADMIN => 'Firm administrator, manage users and projects',
            UserRole::BUSINESS_DEVELOPMENT => 'Create and manage projects, full document access',
            UserRole::CONSULTANT => 'Work on projects, create tasks and requirements',
            UserRole::JV_PARTNER => 'Limited access, view projects and documents',
            UserRole::USER => 'Basic read-only access',
        ];
        
        foreach ($roles as $role => $description) {
            $this->line("  <info>{$role}</info>");
            $this->line("    {$description}");
            $this->newLine();
        }
    }
    
    /**
     * Show permissions for a role
     */
    protected function showPermissions(string $role): void
    {
        $this->newLine();
        $this->info("Permissions for role: {$role}");
        $this->newLine();
        
        $permissions = RolePermissionService::getRolePermissions($role);
        
        if (empty($permissions)) {
            $this->warn('No permissions defined for this role.');
            return;
        }
        
        // Group permissions by category
        $grouped = [];
        foreach ($permissions as $permission) {
            $parts = explode('.', $permission);
            $category = $parts[0] ?? 'other';
            $grouped[$category][] = $permission;
        }
        
        foreach ($grouped as $category => $perms) {
            $this->line("  <comment>{$category}:</comment>");
            foreach ($perms as $perm) {
                $description = RolePermissionService::getPermissionDescription($perm);
                $this->line("    • {$perm}");
                if ($description !== $perm) {
                    $this->line("      <fg=gray>{$description}</>");
                }
            }
            $this->newLine();
        }
    }
}