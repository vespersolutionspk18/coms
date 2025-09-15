<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = Document::with(['uploadedBy', 'project', 'firm', 'requirement', 'task']);

        // Apply tenant filtering for non-superadmins
        if (!$user->isSuperadmin()) {
            $query->whereHas('firm', function($q) use ($user) {
                $q->where('id', $user->firm_id);
            })->orWhere('firm_id', $user->firm_id);
        }

        if ($request->has('project_id')) {
            $project = \App\Models\Project::findOrFail($request->project_id);
            // Check if user can access this project
            if (!$user->canAccessProject($project)) {
                abort(403, 'Access denied: You do not have permission to view documents for this project.');
            }
            $query->where('project_id', $request->project_id);
        }

        if ($request->has('firm_id')) {
            // Check if user can access this firm
            if (!$user->canAccessFirm($request->firm_id)) {
                abort(403, 'Access denied: You do not have permission to view documents for this firm.');
            }
            $query->where('firm_id', $request->firm_id);
        }

        if ($request->has('requirement_id')) {
            $query->where('requirement_id', $request->requirement_id);
        }

        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $documents = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($documents);
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
        $user = auth()->user();
        
        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx', // No size limit
            'name' => 'nullable|string|max:255',
            'project_id' => 'nullable|exists:projects,id',
            'firm_id' => 'nullable|exists:firms,id',
            'requirement_id' => 'nullable|exists:requirements,id',
            'task_id' => 'nullable|exists:tasks,id',
            'tags' => 'nullable|array',
            'status' => 'nullable|in:Pending Review,Approved,Rejected,AI-Reviewed',
        ]);

        // Validate user can access the related entities
        if (isset($validated['project_id'])) {
            $project = \App\Models\Project::findOrFail($validated['project_id']);
            if (!$user->canAccessProject($project)) {
                abort(403, 'Access denied: You cannot upload documents to this project.');
            }
        }
        
        if (isset($validated['firm_id'])) {
            if (!$user->canAccessFirm($validated['firm_id'])) {
                abort(403, 'Access denied: You cannot upload documents to this firm.');
            }
        }
        
        // Non-superadmins can only upload to their own firm if firm_id is not specified
        if (!$user->isSuperadmin() && !isset($validated['firm_id'])) {
            $validated['firm_id'] = $user->firm_id;
        }

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $fileName = $validated['name'] ?? $file->getClientOriginalName();
            
            // Generate unique filename
            $uniqueFileName = Str::uuid() . '_' . $fileName;
            
            // Store file using default disk (S3)
            $path = $file->storeAs('documents', $uniqueFileName);
            
            // Extract text from document if possible (placeholder for future implementation)
            $parsedText = null;
            
            $document = Document::create([
                'name' => $fileName,
                'file_path' => $path,
                'parsed_text' => $parsedText,
                'uploaded_by' => auth()->id(),
                'project_id' => $validated['project_id'] ?? null,
                'firm_id' => $validated['firm_id'] ?? null,
                'requirement_id' => $validated['requirement_id'] ?? null,
                'task_id' => $validated['task_id'] ?? null,
                'tags' => $validated['tags'] ?? null,
                'status' => $validated['status'] ?? 'Pending Review',
                'version' => 1,
            ]);

            return response()->json([
                'message' => 'Document uploaded successfully',
                'document' => $document->load(['uploadedBy', 'requirement'])
            ], 201);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }

    /**
     * Display the specified resource.
     */
    public function show(Document $document)
    {
        $user = auth()->user();
        
        // Check if user can access this document
        if (!$user->isSuperadmin()) {
            if ($document->firm_id && !$user->canAccessFirm($document->firm_id)) {
                abort(403, 'Access denied: You do not have permission to view this document.');
            }
            if ($document->project_id) {
                $project = \App\Models\Project::find($document->project_id);
                if ($project && !$user->canAccessProject($project)) {
                    abort(403, 'Access denied: You do not have permission to view this document.');
                }
            }
        }
        
        $document->load(['uploadedBy', 'project', 'firm', 'requirement', 'task', 'comments.user']);
        
        return response()->json($document);
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
    public function update(Request $request, Document $document)
    {
        $user = auth()->user();
        
        // Check if user can access this document
        if (!$user->isSuperadmin()) {
            if ($document->firm_id && !$user->canAccessFirm($document->firm_id)) {
                abort(403, 'Access denied: You do not have permission to update this document.');
            }
            if ($document->project_id) {
                $project = \App\Models\Project::find($document->project_id);
                if ($project && !$user->canAccessProject($project)) {
                    abort(403, 'Access denied: You do not have permission to update this document.');
                }
            }
        }
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'tags' => 'nullable|array',
            'status' => 'sometimes|in:Pending Review,Approved,Rejected,AI-Reviewed',
            'project_id' => 'nullable|exists:projects,id',
            'firm_id' => 'nullable|exists:firms,id',
            'requirement_id' => 'nullable',
            'task_id' => 'nullable|exists:tasks,id',
        ]);

        // Validate requirement_id separately if provided and not null
        if (isset($validated['requirement_id']) && $validated['requirement_id'] !== null) {
            $request->validate([
                'requirement_id' => 'exists:requirements,id'
            ]);
        }

        // If a new file is uploaded, create a new version
        if ($request->hasFile('file')) {
            $request->validate([
                'file' => 'file|mimes:pdf,doc,docx',
            ]);

            $file = $request->file('file');
            $fileName = $validated['name'] ?? $document->name;
            
            // Generate unique filename for new version
            $uniqueFileName = Str::uuid() . '_v' . ($document->version + 1) . '_' . $fileName;
            
            // Store new file using default disk (S3)
            $path = $file->storeAs('documents', $uniqueFileName);
            
            // Delete old file if exists
            if ($document->file_path && Storage::exists($document->file_path)) {
                Storage::delete($document->file_path);
            }
            
            $validated['file_path'] = $path;
            $validated['version'] = $document->version + 1;
        }

        $document->update($validated);

        return response()->json([
            'message' => 'Document updated successfully',
            'document' => $document->fresh(['uploadedBy', 'requirement'])
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Document $document)
    {
        $user = auth()->user();
        
        // Check if user can access this document
        if (!$user->isSuperadmin()) {
            if ($document->firm_id && !$user->canAccessFirm($document->firm_id)) {
                abort(403, 'Access denied: You do not have permission to delete this document.');
            }
            if ($document->project_id) {
                $project = \App\Models\Project::find($document->project_id);
                if ($project && !$user->canAccessProject($project)) {
                    abort(403, 'Access denied: You do not have permission to delete this document.');
                }
            }
        }
        
        // Delete the physical file
        if ($document->file_path && Storage::exists($document->file_path)) {
            Storage::delete($document->file_path);
        }

        $document->delete();

        return response()->json([
            'message' => 'Document deleted successfully'
        ]);
    }

    /**
     * Download a document
     */
    public function download(Document $document)
    {
        $user = auth()->user();
        
        // Check if user can access this document
        if (!$user->isSuperadmin()) {
            if ($document->firm_id && !$user->canAccessFirm($document->firm_id)) {
                abort(403, 'Access denied: You do not have permission to download this document.');
            }
            if ($document->project_id) {
                $project = \App\Models\Project::find($document->project_id);
                if ($project && !$user->canAccessProject($project)) {
                    abort(403, 'Access denied: You do not have permission to download this document.');
                }
            }
        }
        
        if (!$document->file_path || !Storage::exists($document->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return Storage::download($document->file_path, $document->name);
    }

    /**
     * Get documents for a specific firm
     */
    public function firmDocuments($firmId)
    {
        $user = auth()->user();
        
        // Check if user can access this firm
        if (!$user->canAccessFirm($firmId)) {
            abort(403, 'Access denied: You do not have permission to view documents for this firm.');
        }
        
        $documents = Document::where('firm_id', $firmId)
            ->with('uploadedBy')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
    }

    /**
     * Store a document for a specific firm
     */
    public function storeFirmDocument(Request $request, $firmId)
    {
        $user = auth()->user();
        
        // Check if user can access this firm
        if (!$user->canAccessFirm($firmId)) {
            abort(403, 'Access denied: You do not have permission to upload documents to this firm.');
        }
        
        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf,doc,docx,txt,png,jpg,jpeg,gif,xlsx,xls,csv',
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
        ]);

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $fileName = $validated['name'];
            
            // Generate unique filename
            $uniqueFileName = Str::uuid() . '_' . preg_replace('/[^A-Za-z0-9\-\_\.]/', '_', $file->getClientOriginalName());
            
            // Store file using default disk (S3)
            $path = $file->storeAs('documents', $uniqueFileName);
            
            $document = Document::create([
                'name' => $fileName,
                'category' => $validated['category'] ?? null,
                'file_path' => $path,
                'uploaded_by' => auth()->id(),
                'firm_id' => $firmId,
                'status' => 'Approved',
                'version' => 1,
            ]);

            return response()->json([
                'message' => 'Document uploaded successfully',
                'document' => $document->load('uploadedBy')
            ], 201);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }

    /**
     * Update a firm document
     */
    public function updateFirmDocument(Request $request, $firmId, Document $document)
    {
        $user = auth()->user();
        
        // Check if user can access this firm
        if (!$user->canAccessFirm($firmId)) {
            abort(403, 'Access denied: You do not have permission to update documents for this firm.');
        }
        
        // Ensure document belongs to this firm
        if ($document->firm_id != $firmId) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'nullable|string|max:255',
        ]);

        $document->update($validated);

        return response()->json([
            'message' => 'Document updated successfully',
            'document' => $document->fresh('uploadedBy')
        ]);
    }

    /**
     * Delete a firm document
     */
    public function destroyFirmDocument($firmId, Document $document)
    {
        $user = auth()->user();
        
        // Check if user can access this firm
        if (!$user->canAccessFirm($firmId)) {
            abort(403, 'Access denied: You do not have permission to delete documents for this firm.');
        }
        
        // Ensure document belongs to this firm
        if ($document->firm_id != $firmId) {
            return response()->json(['message' => 'Document not found'], 404);
        }

        // Delete the physical file
        if ($document->file_path && Storage::exists($document->file_path)) {
            Storage::delete($document->file_path);
        }

        $document->delete();

        return response()->json([
            'message' => 'Document deleted successfully'
        ]);
    }
}
