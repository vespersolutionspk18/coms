<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Firm;
use App\Models\Project;
use App\Models\Task;
use App\Models\Document;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected $firm1;
    protected $firm2;
    protected $user1;
    protected $user2;
    protected $superadmin;
    protected $project1;
    protected $project2;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create two firms
        $this->firm1 = Firm::create([
            'name' => 'Firm 1',
            'type' => 'Internal',
            'status' => 'Active',
        ]);
        
        $this->firm2 = Firm::create([
            'name' => 'Firm 2',
            'type' => 'Internal',
            'status' => 'Active',
        ]);
        
        // Create users in different firms
        $this->user1 = User::create([
            'name' => 'User 1',
            'email' => 'user1@test.com',
            'password' => bcrypt('password'),
            'firm_id' => $this->firm1->id,
            'role' => 'consultant',
        ]);
        
        $this->user2 = User::create([
            'name' => 'User 2',
            'email' => 'user2@test.com',
            'password' => bcrypt('password'),
            'firm_id' => $this->firm2->id,
            'role' => 'consultant',
        ]);
        
        $this->superadmin = User::create([
            'name' => 'Superadmin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'firm_id' => $this->firm1->id,
            'role' => 'superadmin',
        ]);
        
        // Create projects for each firm
        $this->project1 = Project::create([
            'title' => 'Project 1',
            'stage' => 'Identification',
            'status' => 'Active',
        ]);
        $this->project1->firms()->attach($this->firm1->id);
        
        $this->project2 = Project::create([
            'title' => 'Project 2',
            'stage' => 'Identification',
            'status' => 'Active',
        ]);
        $this->project2->firms()->attach($this->firm2->id);
    }

    public function test_user_can_only_see_own_firm_projects()
    {
        $this->actingAs($this->user1);
        
        $projects = Project::all();
        
        $this->assertCount(1, $projects);
        $this->assertEquals('Project 1', $projects->first()->title);
    }

    public function test_user_cannot_see_other_firm_projects()
    {
        $this->actingAs($this->user1);
        
        $projects = Project::all();
        
        $this->assertCount(1, $projects);
        $this->assertNotContains('Project 2', $projects->pluck('title'));
    }

    public function test_user_cannot_access_other_firm_project_directly()
    {
        $this->actingAs($this->user1);
        
        $response = $this->get(route('projects.show', $this->project2));
        
        $response->assertStatus(403);
    }

    public function test_superadmin_can_see_all_projects()
    {
        $this->actingAs($this->superadmin);
        
        $projects = Project::all();
        
        $this->assertCount(2, $projects);
    }

    public function test_user_cannot_create_task_in_other_firm_project()
    {
        $this->actingAs($this->user1);
        
        $response = $this->postJson(route('tasks.store'), [
            'project_id' => $this->project2->id,
            'title' => 'Unauthorized Task',
            'status' => 'Todo',
        ]);
        
        $response->assertStatus(403);
    }

    public function test_user_cannot_see_other_firm_users()
    {
        $this->actingAs($this->user1);
        
        $users = User::all();
        
        // Should only see users from their own firm
        $this->assertCount(2, $users); // user1 and superadmin (both in firm1)
        $this->assertNotContains($this->user2->id, $users->pluck('id'));
    }

    public function test_user_cannot_assign_other_firm_user_to_task()
    {
        $this->actingAs($this->user1);
        
        $task = Task::create([
            'project_id' => $this->project1->id,
            'title' => 'Test Task',
            'status' => 'Todo',
        ]);
        
        $response = $this->patchJson(route('tasks.update', $task), [
            'assigned_user_id' => $this->user2->id,
        ]);
        
        $response->assertStatus(403);
    }

    public function test_document_firm_isolation()
    {
        $this->actingAs($this->user1);
        
        // Create document for firm1
        $doc1 = Document::create([
            'name' => 'Doc 1',
            'file_path' => 'test/doc1.pdf',
            'firm_id' => $this->firm1->id,
            'uploaded_by' => $this->user1->id,
        ]);
        
        // Create document for firm2 (bypass for test)
        $doc2 = Document::withoutTenantScope()->create([
            'name' => 'Doc 2',
            'file_path' => 'test/doc2.pdf',
            'firm_id' => $this->firm2->id,
            'uploaded_by' => $this->user2->id,
        ]);
        
        $documents = Document::all();
        
        $this->assertCount(1, $documents);
        $this->assertEquals('Doc 1', $documents->first()->name);
    }

    public function test_cross_tenant_access_is_logged()
    {
        $this->actingAs($this->superadmin);
        
        // Access project from different firm
        $response = $this->get(route('projects.show', $this->project2));
        
        $response->assertStatus(200);
        
        // Check that audit log was created
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $this->superadmin->id,
            'action_type' => 'superadmin_access',
        ]);
    }

    public function test_tenant_scope_bypass_requires_explicit_call()
    {
        $this->actingAs($this->user1);
        
        // Normal query - should be filtered
        $projects = Project::all();
        $this->assertCount(1, $projects);
        
        // Try to bypass (should still fail for non-superadmin)
        $this->expectException(\Exception::class);
        $allProjects = Project::withoutTenantScope()->get();
    }

    public function test_nested_resources_inherit_tenant_isolation()
    {
        $this->actingAs($this->user1);
        
        // Create task for project1
        $task = Task::create([
            'project_id' => $this->project1->id,
            'title' => 'Task 1',
            'status' => 'Todo',
        ]);
        
        // Create task for project2 (bypass for test)
        Task::withoutTenantScope()->create([
            'project_id' => $this->project2->id,
            'title' => 'Task 2',
            'status' => 'Todo',
        ]);
        
        // User should only see tasks from their project
        $tasks = Task::all();
        
        $this->assertCount(1, $tasks);
        $this->assertEquals('Task 1', $tasks->first()->title);
    }
}