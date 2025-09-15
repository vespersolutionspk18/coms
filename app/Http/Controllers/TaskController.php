<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $projectId = $request->get('project_id');
        $cacheKey = "tasks_index_{$projectId}";
        
        $tasks = Cache::remember($cacheKey, 300, function() use ($projectId) {
            $query = Task::with([
                'assignedUser:id,name,email',
                'assignedFirm:id,name'
            ])
            ->select('id', 'project_id', 'title', 'description', 'status', 'priority', 'due_date', 'assigned_user_id', 'assigned_firm_id', 'created_at', 'updated_at');
            
            if ($projectId) {
                $query->where('project_id', $projectId);
            }
            
            return $query->orderBy('created_at', 'desc')->get();
        });
        
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
        
        $task = DB::transaction(function() use ($validated, $request) {
            $task = Task::create($validated);
            $task->load([
                'assignedUser:id,name,email',
                'assignedFirm:id,name'
            ]);
            
            // Clear cache
            Cache::forget("tasks_index_{$validated['project_id']}");
            
            return $task;
        });
        
        return response()->json($task, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $cacheKey = "task_show_{$id}";
        
        $task = Cache::remember($cacheKey, 300, function() use ($id) {
            return Task::with([
                'assignedUser:id,name,email',
                'assignedFirm:id,name',
                'subtasks:id,parent_task_id,title,status,priority,due_date',
                'documents:id,task_id,name,category,created_at'
            ])
            ->select('id', 'project_id', 'title', 'description', 'status', 'priority', 'due_date', 'assigned_user_id', 'assigned_firm_id', 'parent_task_id', 'created_at', 'updated_at')
            ->findOrFail($id);
        });
        
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
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assigned_user_id' => 'nullable|exists:users,id',
            'assigned_firm_id' => 'nullable|exists:firms,id',
            'due_date' => 'nullable|date',
            'status' => 'sometimes|required|in:Todo,In Progress,Done',
            'parent_task_id' => 'nullable|exists:tasks,id',
            'priority' => 'nullable|in:Low,Medium,High,Critical',
        ]);
        
        DB::transaction(function() use ($task, $validated) {
            $task->update($validated);
            
            // Clear relevant caches
            Cache::forget("task_show_{$task->id}");
            Cache::forget("tasks_index_{$task->project_id}");
        });
        
        $task->load([
            'assignedUser:id,name,email',
            'assignedFirm:id,name'
        ]);
        
        return response()->json($task);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $task = Task::findOrFail($id);
        $projectId = $task->project_id;
        
        DB::transaction(function() use ($task, $projectId) {
            $task->delete();
            
            // Clear caches
            Cache::forget("task_show_{$task->id}");
            Cache::forget("tasks_index_{$projectId}");
        });
        
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
        
        DB::transaction(function() use ($task, $validated) {
            $task->update(['status' => $validated['status']]);
            
            // Clear caches
            Cache::forget("task_show_{$task->id}");
            Cache::forget("tasks_index_{$task->project_id}");
        });
        
        $task->load([
            'assignedUser:id,name,email',
            'assignedFirm:id,name'
        ]);
        
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
        
        // Verify user has access to all tasks being reordered
        $taskIds = array_column($validated['tasks'], 'id');
        $tasks = Task::whereIn('id', $taskIds)->with('project')->get();
        
        foreach ($tasks as $task) {
            if (!$user->canAccessProject($task->project)) {
                abort(403, 'Access denied: You do not have permission to reorder these tasks.');
            }
        }
        
        DB::transaction(function() use ($validated, $tasks) {
            // Batch update all tasks
            foreach ($validated['tasks'] as $taskData) {
                Task::where('id', $taskData['id'])->update([
                    'status' => $taskData['status'],
                ]);
            }
            
            // Clear caches for affected projects
            $projectIds = $tasks->pluck('project_id')->unique();
            foreach ($projectIds as $projectId) {
                Cache::forget("tasks_index_{$projectId}");
            }
        });
        
        return response()->json(['message' => 'Tasks updated successfully']);
    }
}
