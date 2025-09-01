<?php

namespace App\Http\Controllers;

use App\Models\Milestone;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MilestoneController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $projectId = $request->get('project_id');
        
        if (!$projectId) {
            return response()->json(['error' => 'Project ID is required'], 400);
        }
        
        $milestones = Milestone::where('project_id', $projectId)
            ->with('requirements')
            ->orderBy('due_date', 'asc')
            ->get();
        
        return response()->json(['milestones' => $milestones]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'status' => 'nullable|in:Pending,Complete,Overdue',
            'requirement_ids' => 'nullable|array',
            'requirement_ids.*' => 'exists:requirements,id'
        ]);
        
        $requirementIds = $validated['requirement_ids'] ?? [];
        unset($validated['requirement_ids']);
        
        $milestone = Milestone::create($validated);
        
        if (!empty($requirementIds)) {
            $milestone->requirements()->sync($requirementIds);
        }
        
        $milestone->load('requirements');
        
        return response()->json(['milestone' => $milestone], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $milestone = Milestone::with('requirements')->findOrFail($id);
        
        return response()->json(['milestone' => $milestone]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $milestone = Milestone::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'status' => 'nullable|in:Pending,Complete,Overdue',
            'requirement_ids' => 'nullable|array',
            'requirement_ids.*' => 'exists:requirements,id'
        ]);
        
        $requirementIds = $validated['requirement_ids'] ?? null;
        unset($validated['requirement_ids']);
        
        $milestone->update($validated);
        
        if ($requirementIds !== null) {
            $milestone->requirements()->sync($requirementIds);
        }
        
        $milestone->load('requirements');
        
        return response()->json(['milestone' => $milestone]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $milestone = Milestone::findOrFail($id);
        $milestone->delete();
        
        return response()->json(['message' => 'Milestone deleted successfully']);
    }
    
    /**
     * Update milestone status
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $milestone = Milestone::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:Pending,Complete,Overdue'
        ]);
        
        $milestone->update(['status' => $validated['status']]);
        
        return response()->json(['milestone' => $milestone]);
    }
    
    /**
     * Bulk update milestones order
     */
    public function updateOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'milestones' => 'required|array',
            'milestones.*.id' => 'required|exists:milestones,id',
            'milestones.*.due_date' => 'nullable|date'
        ]);
        
        foreach ($validated['milestones'] as $item) {
            Milestone::where('id', $item['id'])->update(['due_date' => $item['due_date']]);
        }
        
        return response()->json(['message' => 'Milestone order updated successfully']);
    }
}
