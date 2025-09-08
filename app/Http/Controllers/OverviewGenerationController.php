<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\OverviewGenerationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class OverviewGenerationController extends Controller
{
    protected $overviewService;
    
    public function __construct(OverviewGenerationService $overviewService)
    {
        $this->overviewService = $overviewService;
    }
    
    /**
     * Generate project overview from advertisement image
     */
    public function generateOverview(Request $request)
    {
        try {
            // Validate the request - accept either file upload or base64 data
            $request->validate([
                'file' => 'nullable|file|mimes:jpeg,png,gif,svg,pdf,doc,docx|max:102400', // 100MB max
                'image' => 'nullable|string', // Base64 encoded image or storage path
                'advertisement_path' => 'nullable|string', // Existing file path
                'mime_type' => 'nullable|string'
            ]);
            
            $fileData = null;
            $mimeType = $request->input('mime_type', 'image/jpeg');
            $fileName = null;
            
            // Handle file upload
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $fileData = file_get_contents($file->getPathname());
                $mimeType = $file->getMimeType();
                $fileName = $file->getClientOriginalName();
            }
            // Handle base64 image data
            elseif ($request->has('image')) {
                $image = $request->input('image');
                
                if (str_starts_with($image, 'data:')) {
                    // Handle base64 data URL
                    $parts = explode(',', $image);
                    if (count($parts) == 2) {
                        // Extract mime type from data URL
                        if (preg_match('/data:([^;]+);/', $parts[0], $matches)) {
                            $mimeType = $matches[1];
                        }
                        $fileData = base64_decode($parts[1]);
                    }
                } elseif (str_starts_with($image, '/storage/')) {
                    // Handle storage path
                    $path = str_replace('/storage/', '', $image);
                    if (Storage::exists($path)) {
                        $fileData = Storage::get($path);
                        // Try to determine mime type from file extension
                        $extension = pathinfo($path, PATHINFO_EXTENSION);
                        $mimeType = $this->getMimeTypeFromExtension($extension);
                        $fileName = basename($path);
                    } else {
                        return response()->json([
                            'success' => false,
                            'error' => 'File not found in storage'
                        ], 404);
                    }
                } else {
                    // Assume it's raw base64
                    $fileData = base64_decode($image);
                }
            }
            // Handle existing advertisement path
            elseif ($request->has('advertisement_path')) {
                $path = $request->input('advertisement_path');
                if (Storage::exists($path)) {
                    $fileData = Storage::get($path);
                    $extension = pathinfo($path, PATHINFO_EXTENSION);
                    $mimeType = $this->getMimeTypeFromExtension($extension);
                    $fileName = basename($path);
                } else {
                    return response()->json([
                        'success' => false,
                        'error' => 'Advertisement file not found in storage'
                    ], 404);
                }
            }
            
            if (!$fileData) {
                return response()->json([
                    'success' => false,
                    'error' => 'No file data provided'
                ], 400);
            }
            
            // Call the overview generation service
            $result = $this->overviewService->generateOverviewFromFile($fileData, $mimeType, $fileName);
            
            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'data' => $result['data']
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
            Log::error('Overview generation controller error', [
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
     * Get mime type from file extension
     */
    private function getMimeTypeFromExtension($extension)
    {
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        
        $extension = strtolower($extension);
        return $mimeTypes[$extension] ?? 'application/octet-stream';
    }
}