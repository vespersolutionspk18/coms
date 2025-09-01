<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Firm;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $projects = Project::with('firms', 'milestones')
            ->orderBy('created_at', 'desc')
            ->paginate(20);
        
        return Inertia::render('projects/index', [
            'projects' => $projects
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $firms = Firm::where('status', 'Active')->get();
        $users = User::select('id', 'name', 'email')->get();
        
        return Inertia::render('projects/create', [
            'firms' => $firms,
            'users' => $users
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Decode JSON strings if coming from FormData
        if ($request->has('scope_of_work') && is_string($request->input('scope_of_work'))) {
            $request->merge(['scope_of_work' => json_decode($request->input('scope_of_work'), true)]);
        }
        if ($request->has('firms') && is_string($request->input('firms'))) {
            $request->merge(['firms' => json_decode($request->input('firms'), true)]);
        }
        if ($request->has('requirements') && is_string($request->input('requirements'))) {
            $request->merge(['requirements' => json_decode($request->input('requirements'), true)]);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'sector' => 'nullable|string',
            'scope_of_work' => 'nullable|array',
            'client' => 'nullable|string',
            'client_email' => 'nullable|email|max:255',
            'client_phone' => 'nullable|string|max:50',
            'documents_procurement' => 'nullable|string',
            'stage' => 'required|in:Identification,Pre-Bid,Proposal,Award,Implementation',
            'submission_date' => 'nullable|date',
            'bid_security' => 'nullable|string',
            'status' => 'required|in:Active,Closed,On Hold',
            'pre_bid_expected_date' => 'nullable|date',
            'advertisement' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:5120', // 5MB max
            'firms' => 'nullable|array',
            'firms.*.id' => 'exists:firms,id',
            'firms.*.pivot.role_in_project' => 'sometimes|in:Lead JV,Partner,Subconsultant,Internal',
            'requirements' => 'nullable|array',
            'requirements.*.type' => 'required|string|max:100',
            'requirements.*.title' => 'required|string',
            'requirements.*.priority' => 'required|in:Critical,High,Medium,Low',
            'requirements.*.status' => 'required|in:Pending,In Progress,Complete',
            'requirements.*.description' => 'nullable|string',
        ]);

        $firms = $validated['firms'] ?? [];
        $requirements = $validated['requirements'] ?? [];
        unset($validated['firms'], $validated['requirements']);

        // Handle advertisement image upload
        if ($request->hasFile('advertisement')) {
            $file = $request->file('advertisement');
            $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('advertisements', $fileName, 'public');
            $validated['advertisement'] = $path;
        }

        $project = Project::create($validated);

        // Attach firms with their roles
        foreach ($firms as $firm) {
            $role = $firm['pivot']['role_in_project'] ?? 'Partner';
            $project->firms()->attach($firm['id'], ['role_in_project' => $role]);
        }

        // Create requirements
        foreach ($requirements as $requirement) {
            $project->requirements()->create($requirement);
        }

        return redirect()->route('projects.edit', $project)->with('success', 'Project created successfully');
    }

    /**
     * Display the specified resource.
     */
    public function show(Project $project)
    {
        $project->load([
            'firms',
            'requirements.assignedFirm',
            'requirements.assignedUser',
            'tasks.assignedUser',
            'tasks.requirement',
            'tasks.assignedFirm',
            'documents.uploadedBy',
            'documents.firm',
            'milestones'
        ]);
        
        $firms = Firm::where('status', 'Active')->get();
        $users = User::select('id', 'name', 'email')->get();
        
        return Inertia::render('projects/show', [
            'project' => $project,
            'firms' => $firms,
            'users' => $users,
            'requirements' => $project->requirements
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Project $project)
    {
        $project->load([
            'firms',
            'requirements.assignedFirm',
            'requirements.assignedUser',
            'tasks.assignedUser',
            'tasks.requirement',
            'tasks.assignedFirm',
            'documents.uploadedBy',
            'documents.firm',
            'milestones'
        ]);
        
        $firms = Firm::where('status', 'Active')->get();
        $users = User::select('id', 'name', 'email')->get();
        
        return Inertia::render('projects/edit', [
            'project' => $project,
            'firms' => $firms,
            'users' => $users,
            'requirements' => $project->requirements
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Project $project)
    {
        // Decode JSON strings if coming from FormData
        if ($request->has('scope_of_work') && is_string($request->input('scope_of_work'))) {
            $request->merge(['scope_of_work' => json_decode($request->input('scope_of_work'), true)]);
        }
        if ($request->has('firms') && is_string($request->input('firms'))) {
            $request->merge(['firms' => json_decode($request->input('firms'), true)]);
        }
        if ($request->has('requirements') && is_string($request->input('requirements'))) {
            $request->merge(['requirements' => json_decode($request->input('requirements'), true)]);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'sector' => 'nullable|string',
            'scope_of_work' => 'nullable|array',
            'client' => 'nullable|string',
            'client_email' => 'nullable|email|max:255',
            'client_phone' => 'nullable|string|max:50',
            'documents_procurement' => 'nullable|string',
            'stage' => 'sometimes|required|in:Identification,Pre-Bid,Proposal,Award,Implementation',
            'submission_date' => 'nullable|date',
            'bid_security' => 'nullable|string',
            'status' => 'sometimes|required|in:Active,Closed,On Hold',
            'pre_bid_expected_date' => 'nullable|date',
            'advertisement' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:5120', // 5MB max
            'remove_advertisement' => 'sometimes|boolean',
            'firms' => 'nullable|array',
            'firms.*.id' => 'exists:firms,id',
            'firms.*.pivot.role_in_project' => 'sometimes|in:Lead JV,Partner,Subconsultant,Internal',
            'requirements' => 'nullable|array',
            'requirements.*.id' => 'sometimes|integer',
            'requirements.*.type' => 'required|string|max:100',
            'requirements.*.title' => 'required|string',
            'requirements.*.priority' => 'required|in:Critical,High,Medium,Low',
            'requirements.*.status' => 'required|in:Pending,In Progress,Complete',
            'requirements.*.description' => 'nullable|string',
        ]);

        $firms = $validated['firms'] ?? null;
        $requirements = $validated['requirements'] ?? null;
        $removeAdvertisement = $validated['remove_advertisement'] ?? false;
        unset($validated['firms'], $validated['requirements'], $validated['remove_advertisement']);

        // Handle advertisement image update
        if ($request->hasFile('advertisement')) {
            // Delete old advertisement if exists
            if ($project->advertisement && Storage::disk('public')->exists($project->advertisement)) {
                Storage::disk('public')->delete($project->advertisement);
            }
            
            $file = $request->file('advertisement');
            $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('advertisements', $fileName, 'public');
            $validated['advertisement'] = $path;
        } elseif ($removeAdvertisement) {
            // Remove advertisement if requested
            if ($project->advertisement && Storage::disk('public')->exists($project->advertisement)) {
                Storage::disk('public')->delete($project->advertisement);
            }
            $validated['advertisement'] = null;
        }

        $project->update($validated);

        // Update firms if provided
        if ($firms !== null) {
            $syncData = [];
            foreach ($firms as $firm) {
                $role = $firm['pivot']['role_in_project'] ?? 'Partner';
                $syncData[$firm['id']] = ['role_in_project' => $role];
            }
            $project->firms()->sync($syncData);
        }

        // Update requirements if provided
        if ($requirements !== null) {
            // Get existing requirement IDs
            $existingIds = $project->requirements()->pluck('id')->toArray();
            $updatedIds = [];

            foreach ($requirements as $requirement) {
                if (isset($requirement['id']) && in_array($requirement['id'], $existingIds)) {
                    // Update existing requirement
                    $project->requirements()->where('id', $requirement['id'])->update($requirement);
                    $updatedIds[] = $requirement['id'];
                } else {
                    // Create new requirement
                    $newReq = $project->requirements()->create($requirement);
                    $updatedIds[] = $newReq->id;
                }
            }

            // Delete requirements that were removed
            $project->requirements()->whereNotIn('id', $updatedIds)->delete();
        }

        return redirect()->back()->with('success', 'Project updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Project $project)
    {
        // Delete advertisement image if exists
        if ($project->advertisement && Storage::disk('public')->exists($project->advertisement)) {
            Storage::disk('public')->delete($project->advertisement);
        }
        
        $project->delete();
        
        return redirect()->route('projects.index');
    }
}