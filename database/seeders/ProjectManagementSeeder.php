<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Firm;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\Task;
use App\Models\Document;
use App\Models\Milestone;
use App\Models\Notification;
use Faker\Factory as Faker;

class ProjectManagementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $faker = Faker::create();

        // Create Firms
        $firms = [];
        $firmTypes = ['Internal', 'JV Partner'];
        $firmStatuses = ['Active', 'Inactive'];
        
        for ($i = 0; $i < 10; $i++) {
            $firms[] = Firm::create([
                'name' => $faker->company,
                'type' => $faker->randomElement($firmTypes),
                'contact_email' => $faker->companyEmail,
                'contact_phone' => $faker->phoneNumber,
                'address' => $faker->address,
                'status' => $faker->randomElement($firmStatuses),
                'notes' => $faker->paragraph,
                'rating' => $faker->randomFloat(1, 1, 10),
                'ai_metadata' => json_encode(['tags' => $faker->words(3)]),
            ]);
        }

        // Create Users for each firm
        $users = [];
        $roles = ['Admin', 'BD', 'Consultant', 'JV Partner User'];
        
        foreach ($firms as $firm) {
            for ($i = 0; $i < rand(2, 5); $i++) {
                $users[] = User::create([
                    'name' => $faker->name,
                    'email' => $faker->unique()->safeEmail,
                    'password' => bcrypt('password'),
                    'role' => $faker->randomElement($roles),
                    'firm_id' => $firm->id,
                    'status' => $faker->randomElement(['Active', 'Inactive']),
                    'notification_preferences' => json_encode([
                        'email' => $faker->boolean,
                        'sms' => $faker->boolean,
                        'push' => $faker->boolean,
                    ]),
                ]);
            }
        }

        // Update firms with primary contacts
        foreach ($firms as $firm) {
            $firmUsers = User::where('firm_id', $firm->id)->get();
            if ($firmUsers->count() > 0) {
                $firm->update(['primary_contact_id' => $firmUsers->random()->id]);
            }
        }

        // Create Projects
        $projects = [];
        $stages = ['Identification', 'Pre-Bid', 'Proposal', 'Award', 'Implementation'];
        $projectStatuses = ['Active', 'Closed', 'On Hold'];
        $sectors = ['Technology', 'Healthcare', 'Education', 'Infrastructure', 'Energy', 'Finance', 'Manufacturing'];
        $scopeOfWork = [
            ['System Design', 'Implementation', 'Testing'],
            ['Consulting', 'Strategy', 'Execution'],
            ['Research', 'Development', 'Deployment'],
            ['Planning', 'Construction', 'Maintenance'],
            ['Analysis', 'Optimization', 'Support'],
        ];
        
        for ($i = 0; $i < 25; $i++) {
            $project = Project::create([
                'title' => 'Project ' . $faker->catchPhrase,
                'sector' => $faker->randomElement($sectors),
                'scope_of_work' => $faker->randomElement($scopeOfWork),
                'client' => $faker->company,
                'stage' => $faker->randomElement($stages),
                'submission_date' => $faker->dateTimeBetween('+1 week', '+6 months'),
                'bid_security' => $faker->randomFloat(2, 10000, 500000),
                'status' => $faker->randomElement($projectStatuses),
                'pre_bid_expected_date' => $faker->dateTimeBetween('now', '+3 months'),
                'ai_metadata' => json_encode([
                    'risk_level' => $faker->randomElement(['Low', 'Medium', 'High']),
                    'estimated_duration' => $faker->numberBetween(3, 24) . ' months',
                ]),
            ]);

            // Assign firms to projects
            $assignedFirms = $faker->randomElements($firms, rand(1, 3));
            $roles = ['Lead JV', 'Subconsultant', 'Internal'];
            foreach ($assignedFirms as $index => $firm) {
                $project->firms()->attach($firm->id, [
                    'role_in_project' => $index === 0 ? 'Lead JV' : $faker->randomElement($roles),
                ]);
            }

            $projects[] = $project;
        }

        // Create Requirements for projects
        $requirementTypes = ['Document', 'Personnel', 'Financial'];
        $priorities = ['High', 'Medium', 'Low'];
        $requirementStatuses = ['Pending', 'In Progress', 'Complete'];
        
        foreach ($projects as $project) {
            $numRequirements = rand(3, 10);
            for ($i = 0; $i < $numRequirements; $i++) {
                Requirement::create([
                    'project_id' => $project->id,
                    'type' => $faker->randomElement($requirementTypes),
                    'description' => $faker->sentence(10),
                    'priority' => $faker->randomElement($priorities),
                    'assigned_firm_id' => $faker->boolean(70) ? $faker->randomElement($firms)->id : null,
                    'assigned_user_id' => $faker->boolean(50) ? $faker->randomElement($users)->id : null,
                    'status' => $faker->randomElement($requirementStatuses),
                    'ai_metadata' => json_encode([
                        'estimated_effort' => $faker->numberBetween(1, 40) . ' hours',
                        'complexity' => $faker->randomElement(['Simple', 'Moderate', 'Complex']),
                    ]),
                ]);
            }
        }

        // Create Tasks for projects
        $taskStatuses = ['Todo', 'In Progress', 'Done'];
        
        foreach ($projects as $project) {
            $projectRequirements = Requirement::where('project_id', $project->id)->get();
            $numTasks = rand(5, 15);
            
            for ($i = 0; $i < $numTasks; $i++) {
                Task::create([
                    'project_id' => $project->id,
                    'requirement_id' => $projectRequirements->count() > 0 && $faker->boolean(60) 
                        ? $projectRequirements->random()->id 
                        : null,
                    'title' => $faker->sentence(6),
                    'description' => $faker->paragraph,
                    'assigned_user_id' => $faker->boolean(80) ? $faker->randomElement($users)->id : null,
                    'assigned_firm_id' => $faker->boolean(60) ? $faker->randomElement($firms)->id : null,
                    'due_date' => $faker->dateTimeBetween('now', '+2 months'),
                    'status' => $faker->randomElement($taskStatuses),
                ]);
            }
        }

        // Create Milestones for projects
        $milestoneStatuses = ['Pending', 'Complete', 'Overdue'];
        
        foreach ($projects as $project) {
            $numMilestones = rand(2, 5);
            for ($i = 0; $i < $numMilestones; $i++) {
                Milestone::create([
                    'project_id' => $project->id,
                    'title' => 'Milestone ' . ($i + 1) . ': ' . $faker->sentence(4),
                    'description' => $faker->paragraph,
                    'due_date' => $faker->dateTimeBetween('now', '+6 months'),
                    'status' => $faker->randomElement($milestoneStatuses),
                ]);
            }
        }

        // Create Documents
        $documentStatuses = ['Pending Review', 'Approved', 'Rejected', 'AI-Reviewed'];
        $documentTypes = ['Contract', 'Proposal', 'Report', 'Specification', 'Drawing', 'Presentation'];
        
        foreach ($projects as $project) {
            $numDocuments = rand(2, 8);
            for ($i = 0; $i < $numDocuments; $i++) {
                Document::create([
                    'name' => $faker->randomElement($documentTypes) . '_' . $faker->word . '.' . $faker->fileExtension,
                    'file_path' => '/documents/' . $faker->uuid . '.' . $faker->fileExtension,
                    'parsed_text' => $faker->paragraphs(3, true),
                    'uploaded_by' => $faker->randomElement($users)->id,
                    'tags' => $faker->words(rand(2, 5)),
                    'firm_id' => $faker->boolean(70) ? $faker->randomElement($firms)->id : null,
                    'project_id' => $project->id,
                    'version' => $faker->numberBetween(1, 5),
                    'status' => $faker->randomElement($documentStatuses),
                ]);
            }
        }

        // Create Notifications for users
        $notificationTypes = ['Task Due', 'Document Uploaded', 'Requirement Pending', 'Compliance Alert'];
        
        foreach ($users as $user) {
            $numNotifications = rand(0, 5);
            for ($i = 0; $i < $numNotifications; $i++) {
                Notification::create([
                    'user_id' => $user->id,
                    'type' => $faker->randomElement($notificationTypes),
                    'project_id' => $faker->boolean(80) ? $faker->randomElement($projects)->id : null,
                    'read_status' => $faker->boolean(60),
                ]);
            }
        }

        $this->command->info('Project management sample data seeded successfully!');
    }
}