<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\RequirementsGenerationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Document;

class RequirementsGenerationController extends Controller
{
    protected $requirementsService;
    
    public function __construct(RequirementsGenerationService $requirementsService)
    {
        $this->requirementsService = $requirementsService;
    }
    
    /**
     * Generate requirements from selected documents
     */
    public function generateRequirements(Request $request)
    {
        try {
            // Validate the request
            $request->validate([
                'document_ids' => 'required|array|min:1',
                'document_ids.*' => 'required|exists:documents,id',
                'project_id' => 'required|exists:projects,id'
            ]);
            
            // Fetch the documents
            $documents = Document::whereIn('id', $request->input('document_ids'))
                ->where('project_id', $request->input('project_id'))
                ->get();
            
            if ($documents->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'error' => 'No valid documents found for the selected project'
                ], 404);
            }
            
            // Prepare document data for the service
            $documentData = $documents->map(function ($doc) {
                return [
                    'file_path' => $doc->file_path,
                    'name' => $doc->name
                ];
            })->toArray();
            
            // Call the requirements generation service
            $result = $this->requirementsService->generateRequirementsFromDocuments($documentData);
            
            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'data' => $result['data'],
                    'message' => 'Requirements generated successfully from ' . count($documents) . ' document(s)'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => $result['error']
                ], 500);
            }
            
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Requirements generation controller error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'An unexpected error occurred: ' . $e->getMessage()
            ], 500);
        }
    }
}