<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $projectId = $request->get('project_id');
        
        $query = Task::with(['assignedUser', 'requirement', 'assignedFirm']);
        
        if ($projectId) {
            $query->where('project_id', $projectId);
        }
        
        $tasks = $query->orderBy('created_at', 'desc')->get();
        
        return response()->json($tasks);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'requirement_id' => 'nullable|exists:requirements,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_user_id' => 'nullable|exists:users,id',
            'assigned_firm_id' => 'nullable|exists:firms,id',
            'due_date' => 'nullable|date',
            'status' => 'required|in:Todo,In Progress,Done',
            'parent_task_id' => 'nullable|exists:tasks,id',
            'priority' => 'nullable|in:Low,Medium,High,Critical',
        ]);
        
        if (!isset($validated['assigned_user_id']) && Auth::check()) {
            $validated['assigned_user_id'] = Auth::id();
        }
        
        $task = Task::create($validated);
        $task->load(['assignedUser', 'requirement', 'assignedFirm']);
        
        return response()->json($task, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $task = Task::with(['assignedUser', 'requirement', 'assignedFirm', 'subtasks', 'documents'])
            ->findOrFail($id);
        
        return response()->json($task);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $task = Task::findOrFail($id);
        
        $validated = $request->validate([
            'project_id' => 'sometimes|required|exists:projects,id',
            'requirement_id' => 'nullable|exists:requirements,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assigned_user_id' => 'nullable|exists:users,id',
            'assigned_firm_id' => 'nullable|exists:firms,id',
            'due_date' => 'nullable|date',
            'status' => 'sometimes|required|in:Todo,In Progress,Done',
            'parent_task_id' => 'nullable|exists:tasks,id',
            'priority' => 'nullable|in:Low,Medium,High,Critical',
        ]);
        
        $task->update($validated);
        $task->load(['assignedUser', 'requirement', 'assignedFirm']);
        
        return response()->json($task);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $task = Task::findOrFail($id);
        $task->delete();
        
        return response()->json(['message' => 'Task deleted successfully']);
    }
    
    /**
     * Update task status (for kanban drag and drop)
     */
    public function updateStatus(Request $request, string $id)
    {
        $task = Task::findOrFail($id);
        
        $validated = $request->validate([
            'status' => 'required|in:Todo,In Progress,Done',
        ]);
        
        $task->update(['status' => $validated['status']]);
        $task->load(['assignedUser', 'requirement', 'assignedFirm']);
        
        return response()->json($task);
    }
    
    /**
     * Bulk update tasks order (for kanban drag and drop)
     */
    public function updateOrder(Request $request)
    {
        $validated = $request->validate([
            'tasks' => 'required|array',
            'tasks.*.id' => 'required|exists:tasks,id',
            'tasks.*.status' => 'required|in:Todo,In Progress,Done',
            'tasks.*.order' => 'nullable|integer',
        ]);
        
        foreach ($validated['tasks'] as $taskData) {
            Task::where('id', $taskData['id'])->update([
                'status' => $taskData['status'],
            ]);
        }
        
        return response()->json(['message' => 'Tasks updated successfully']);
    }
}
