<?php

namespace App\Http\Controllers;

use App\Models\Requirement;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RequirementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Requirement::with('project', 'assignedUser', 'assignedFirm');
        
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }
        
        $requirements = $query->paginate(15);
        
        return Inertia::render('Requirements/Index', [
            'requirements' => $requirements
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Requirements/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'type' => 'required|string|max:255', // Allow ANY type
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:Critical,High,Medium,Low',
            'assigned_firm_id' => 'nullable|exists:firms,id',
            'assigned_user_id' => 'nullable|exists:users,id',
            'status' => 'required|in:Pending,In Progress,Complete',
            'dependency_id' => 'nullable|exists:requirements,id',
        ]);

        $requirement = Requirement::create($validated);

        return redirect()->route('requirements.show', $requirement);
    }

    /**
     * Display the specified resource.
     */
    public function show(Requirement $requirement)
    {
        $requirement->load('project', 'assignedUser', 'assignedFirm', 'documents', 'tasks', 'dependency', 'dependents');
        
        return Inertia::render('Requirements/Show', [
            'requirement' => $requirement
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Requirement $requirement)
    {
        return Inertia::render('Requirements/Edit', [
            'requirement' => $requirement
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Requirement $requirement)
    {
        $validated = $request->validate([
            'type' => 'sometimes|required|string|max:255', // Allow ANY type
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'sometimes|required|in:Critical,High,Medium,Low',
            'assigned_firm_id' => 'nullable|exists:firms,id',
            'assigned_user_id' => 'nullable|exists:users,id',
            'status' => 'sometimes|required|in:Pending,In Progress,Complete',
            'dependency_id' => 'nullable|exists:requirements,id',
        ]);

        $requirement->update($validated);

        return redirect()->route('requirements.show', $requirement);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Requirement $requirement)
    {
        $requirement->delete();
        
        return redirect()->route('requirements.index');
    }
    
    /**
     * Clear all requirements for a specific project
     */
    public function clearAll($projectId)
    {
        try {
            // Verify the project exists and belongs to the user
            $project = Project::findOrFail($projectId);
            
            // Delete all requirements for this project
            $deletedCount = Requirement::where('project_id', $projectId)->delete();
            
            return response()->json([
                'success' => true,
                'message' => "Successfully deleted {$deletedCount} requirements",
                'deleted_count' => $deletedCount
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to clear requirements: ' . $e->getMessage()
            ], 500);
        }
    }
}