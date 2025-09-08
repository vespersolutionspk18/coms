<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\RequirementsGenerationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Document;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\Auth;

class RequirementsGenerationController extends Controller
{
    protected $requirementsService;
    
    public function __construct(RequirementsGenerationService $requirementsService)
    {
        $this->requirementsService = $requirementsService;
    }
    
    /**
     * Generate requirements from selected documents with progress updates
     */
    public function generateRequirements(Request $request)
    {
        try {
            // Handle both array format and indexed format from GET request
            $documentIds = $request->input('document_ids', []);
            if (empty($documentIds)) {
                // Try to get indexed format (document_ids[0], document_ids[1], etc.)
                $documentIds = [];
                $index = 0;
                while ($request->has("document_ids.{$index}")) {
                    $documentIds[] = $request->input("document_ids.{$index}");
                    $index++;
                }
            }
            
            // Validate the request
            $validator = \Validator::make([
                'document_ids' => $documentIds,
                'project_id' => $request->input('project_id')
            ], [
                'document_ids' => 'required|array|min:1',
                'document_ids.*' => 'required|exists:documents,id',
                'project_id' => 'required|exists:projects,id'
            ]);
            
            if ($validator->fails()) {
                throw new \Illuminate\Validation\ValidationException($validator);
            }
            
            // Return a streamed response for progress updates
            $response = new StreamedResponse(function () use ($request, $documentIds) {
                // Disable output buffering
                if (ob_get_level()) {
                    ob_end_clean();
                }
                
                // Set up SSE headers
                header('Cache-Control: no-cache');
                header('Content-Type: text/event-stream');
                header('X-Accel-Buffering: no');
                
                // Send initial message
                $this->sendSSEMessage([
                    'type' => 'start',
                    'message' => 'Starting requirement extraction process...'
                ]);
                
                try {
                    // Fetch the documents
                    $documents = Document::whereIn('id', $documentIds)
                        ->where('project_id', $request->input('project_id'))
                        ->get();
                    
                    if ($documents->isEmpty()) {
                        $this->sendSSEMessage([
                            'type' => 'error',
                            'error' => 'No valid documents found for the selected project'
                        ]);
                        return;
                    }
                    
                    // Prepare document data for the service
                    $documentData = $documents->map(function ($doc) {
                        return [
                            'file_path' => $doc->file_path,
                            'name' => $doc->name
                        ];
                    })->toArray();
                    
                    // Create a progress callback with keepalive
                    $lastPingTime = time();
                    $progressCallback = function($update) use (&$lastPingTime) {
                        // Send the update
                        $this->sendSSEMessage($update);
                        
                        // Send periodic keepalive pings
                        if (time() - $lastPingTime > 15) {
                            $this->sendSSEMessage(['type' => 'ping']);
                            $lastPingTime = time();
                        }
                    };
                    
                    // Call the requirements generation service with progress callback
                    $result = $this->requirementsService->generateRequirementsFromDocuments(
                        $documentData, 
                        $progressCallback
                    );
                    
                    if ($result['success']) {
                        // Save requirements to database
                        $savedRequirements = [];
                        $totalRequirements = count($result['data']);
                        $savedCount = 0;
                        
                        $this->sendSSEMessage([
                            'type' => 'progress',
                            'stage' => 'saving',
                            'message' => 'Saving requirements to database...',
                            'progress' => 95
                        ]);
                        
                        foreach ($result['data'] as $requirement) {
                            $savedReq = \App\Models\Requirement::create([
                                'project_id' => $request->input('project_id'),
                                'type' => $requirement['type'],
                                'title' => $requirement['title'],
                                'description' => $requirement['description'],
                                'priority' => $requirement['priority'],
                                'status' => $requirement['status'] ?? 'Pending',
                                'ai_metadata' => [
                                    'generated_at' => now()->toISOString(),
                                    'document_ids' => $documentIds,
                                    'generation_method' => 'layered_extraction'
                                ]
                            ]);
                            
                            // Add the saved requirement with its database ID to the response
                            $savedRequirements[] = array_merge($requirement, [
                                'id' => $savedReq->id,
                                'created_at' => $savedReq->created_at->toISOString(),
                                'updated_at' => $savedReq->updated_at->toISOString()
                            ]);
                            
                            $savedCount++;
                        }
                        
                        Log::info('Requirements saved to database', [
                            'project_id' => $request->input('project_id'),
                            'count' => count($savedRequirements)
                        ]);
                        
                        // Send final success message
                        $this->sendSSEMessage([
                            'type' => 'complete',
                            'data' => $savedRequirements,
                            'message' => 'Requirements generated and saved successfully from ' . count($documents) . ' document(s)',
                            'progress' => 100
                        ]);
                        
                    } else {
                        $this->sendSSEMessage([
                            'type' => 'error',
                            'error' => $result['error']
                        ]);
                    }
                    
                } catch (\Exception $e) {
                    Log::error('Requirements generation error', [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    
                    $this->sendSSEMessage([
                        'type' => 'error',
                        'error' => 'An unexpected error occurred: ' . $e->getMessage()
                    ]);
                }
                
                // Send end signal
                $this->sendSSEMessage(['type' => 'end']);
                flush();
            });
            
            return $response;
            
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
    
    /**
     * Send SSE message
     */
    private function sendSSEMessage($data)
    {
        echo "data: " . json_encode($data) . "\n\n";
        flush();
    }
    
    /**
     * Generate requirements SSE endpoint (public route with session check)
     */
    public function generateRequirementsSSE(Request $request)
    {
        // Check if user is authenticated using session
        if (!Auth::check()) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }
        
        // Call the main generation method
        return $this->generateRequirements($request);
    }
}