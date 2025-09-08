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
        $user = auth()->user();
        
        if ($user->isSuperadmin()) {
            $projects = Project::with('firms', 'milestones')
                ->orderBy('created_at', 'desc')
                ->paginate(20);
        } else {
            $projects = Project::with('firms', 'milestones')
                ->whereHas('firms', function($query) use ($user) {
                    $query->where('firms.id', $user->firm_id);
                })
                ->orderBy('created_at', 'desc')
                ->paginate(20);
        }
        
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
            'advertisement' => 'nullable|file|mimes:jpeg,png,jpg,gif,svg,pdf,doc,docx', // No size limit
            'firms' => 'nullable|array',
            'firms.*.id' => 'exists:firms,id',
            'firms.*.pivot.role_in_project' => 'sometimes|in:Lead JV,Subconsultant,Internal',
            'firms.*.selectedDocuments' => 'sometimes|array',
            'firms.*.selectedDocuments.*.id' => 'sometimes|exists:documents,id',
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

        // Handle advertisement image upload using default disk (S3)
        if ($request->hasFile('advertisement')) {
            $file = $request->file('advertisement');
            $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('advertisements', $fileName);
            $validated['advertisement'] = $path;
        }

        $project = Project::create($validated);

        // Attach firms with their roles and selected documents
        foreach ($firms as $firm) {
            $role = $firm['pivot']['role_in_project'] ?? 'Subconsultant';
            $selectedDocIds = [];
            
            // Extract selected document IDs
            if (isset($firm['selectedDocuments']) && is_array($firm['selectedDocuments'])) {
                foreach ($firm['selectedDocuments'] as $doc) {
                    if (isset($doc['id'])) {
                        $selectedDocIds[] = $doc['id'];
                    }
                }
            }
            
            $project->firms()->attach($firm['id'], [
                'role_in_project' => $role,
                'selected_documents' => json_encode($selectedDocIds)
            ]);
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
        \Log::info('Edit method called for project ' . $project->id);
        
        $project->load([
            'firms.documents',
            'requirements.assignedFirm',
            'requirements.assignedUser',
            'tasks.assignedUser',
            'tasks.assignedFirm',
            'documents.uploadedBy',
            'documents.firm',
            'milestones'
        ]);
        
        \Log::info('Loaded ' . $project->firms->count() . ' firms for project');
        
        // Add documents to each firm in the project and decode selected documents
        $project->firms->each(function ($firm) {
            $firm->documents = $firm->documents()->select('id', 'name', 'category', 'created_at')->get();
            
            // Decode selected documents from pivot
            \Log::info('Loading firm ' . $firm->id . ' with pivot data: ' . json_encode($firm->pivot->toArray()));
            
            if ($firm->pivot->selected_documents) {
                $selectedIds = json_decode($firm->pivot->selected_documents, true) ?? [];
                \Log::info('Decoded selected document IDs for firm ' . $firm->id . ': ' . json_encode($selectedIds));
                
                $firm->selectedDocuments = $firm->documents->filter(function ($doc) use ($selectedIds) {
                    return in_array($doc->id, $selectedIds);
                })->values();
                
                \Log::info('Firm ' . $firm->id . ' has ' . $firm->selectedDocuments->count() . ' selected documents');
            } else {
                \Log::info('Firm ' . $firm->id . ' has no selected_documents in pivot');
                $firm->selectedDocuments = [];
            }
        });
        
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
            'advertisement' => 'nullable|file|mimes:jpeg,png,jpg,gif,svg,pdf,doc,docx', // No size limit
            'remove_advertisement' => 'sometimes|boolean',
            'firms' => 'nullable|array',
            'firms.*.id' => 'exists:firms,id',
            'firms.*.pivot.role_in_project' => 'sometimes|in:Lead JV,Subconsultant,Internal',
            'firms.*.selectedDocuments' => 'sometimes|array',
            'firms.*.selectedDocuments.*.id' => 'sometimes|exists:documents,id',
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

        // Handle advertisement image update using default disk (S3)
        if ($request->hasFile('advertisement')) {
            // Delete old advertisement if exists
            if ($project->advertisement && Storage::exists($project->advertisement)) {
                Storage::delete($project->advertisement);
            }
            
            $file = $request->file('advertisement');
            $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('advertisements', $fileName);
            $validated['advertisement'] = $path;
        } elseif ($removeAdvertisement) {
            // Remove advertisement if requested
            if ($project->advertisement && Storage::exists($project->advertisement)) {
                Storage::delete($project->advertisement);
            }
            $validated['advertisement'] = null;
        }

        $project->update($validated);

        // Update firms if provided
        if ($firms !== null) {
            $syncData = [];
            foreach ($firms as $firm) {
                $role = $firm['pivot']['role_in_project'] ?? 'Subconsultant';
                $selectedDocIds = [];
                
                // Extract selected document IDs
                if (isset($firm['selectedDocuments']) && is_array($firm['selectedDocuments'])) {
                    foreach ($firm['selectedDocuments'] as $doc) {
                        if (isset($doc['id'])) {
                            $selectedDocIds[] = $doc['id'];
                        }
                    }
                }
                
                \Log::info('Saving firm ' . $firm['id'] . ' with selected documents: ' . json_encode($selectedDocIds));
                
                $syncData[$firm['id']] = [
                    'role_in_project' => $role,
                    'selected_documents' => json_encode($selectedDocIds)
                ];
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

        \Log::info('Update complete, returning Inertia response');
        
        // Load fresh data for the response
        $project->load([
            'firms.documents',
            'requirements.assignedFirm',
            'requirements.assignedUser',
            'tasks.assignedUser',
            'tasks.assignedFirm',
            'documents.uploadedBy',
            'documents.firm',
            'milestones'
        ]);
        
        // Add documents to each firm in the project and decode selected documents
        $project->firms->each(function ($firm) {
            $firm->documents = $firm->documents()->select('id', 'name', 'category', 'created_at')->get();
            
            // Decode selected documents from pivot
            \Log::info('Processing firm ' . $firm->id . ' with pivot: ' . json_encode($firm->pivot->toArray()));
            
            if ($firm->pivot->selected_documents) {
                $selectedIds = json_decode($firm->pivot->selected_documents, true) ?? [];
                \Log::info('Firm ' . $firm->id . ' selected doc IDs: ' . json_encode($selectedIds));
                
                $firm->selectedDocuments = $firm->documents->filter(function ($doc) use ($selectedIds) {
                    return in_array($doc->id, $selectedIds);
                })->values();
                
                \Log::info('Firm ' . $firm->id . ' has ' . $firm->selectedDocuments->count() . ' selected documents after filtering');
            } else {
                $firm->selectedDocuments = [];
            }
        });
        
        $firms = Firm::where('status', 'Active')->get();
        $users = User::select('id', 'name', 'email')->get();
        
        // Return Inertia response with updated data
        return Inertia::render('projects/edit', [
            'project' => $project,
            'firms' => $firms,
            'users' => $users,
            'requirements' => $project->requirements
        ])->with('success', 'Project updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Project $project)
    {
        // Delete advertisement image if exists
        if ($project->advertisement && Storage::exists($project->advertisement)) {
            Storage::delete($project->advertisement);
        }
        
        $project->delete();
        
        return redirect()->route('projects.index');
    }
}