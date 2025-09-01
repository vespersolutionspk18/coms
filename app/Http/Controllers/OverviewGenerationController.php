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
            // Validate the request
            $request->validate([
                'image' => 'required|string', // Base64 encoded image or storage path
                'mime_type' => 'nullable|string'
            ]);
            
            $imageData = null;
            $mimeType = $request->input('mime_type', 'image/jpeg');
            
            // Check if it's a base64 string or a storage path
            $image = $request->input('image');
            
            if (str_starts_with($image, 'data:')) {
                // Handle base64 data URL
                $parts = explode(',', $image);
                if (count($parts) == 2) {
                    // Extract mime type from data URL
                    if (preg_match('/data:([^;]+);/', $parts[0], $matches)) {
                        $mimeType = $matches[1];
                    }
                    $imageData = base64_decode($parts[1]);
                }
            } elseif (str_starts_with($image, '/storage/')) {
                // Handle storage path
                $path = str_replace('/storage/', '', $image);
                if (Storage::disk('public')->exists($path)) {
                    $imageData = Storage::disk('public')->get($path);
                    // Try to determine mime type from file extension
                    $extension = pathinfo($path, PATHINFO_EXTENSION);
                    $mimeType = $this->getMimeTypeFromExtension($extension);
                } else {
                    return response()->json([
                        'success' => false,
                        'error' => 'Image file not found in storage'
                    ], 404);
                }
            } else {
                // Assume it's raw base64
                $imageData = base64_decode($image);
            }
            
            if (!$imageData) {
                return response()->json([
                    'success' => false,
                    'error' => 'Invalid image data provided'
                ], 400);
            }
            
            // Call the overview generation service
            $result = $this->overviewService->generateOverviewFromImage($imageData, $mimeType);
            
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
        ];
        
        $extension = strtolower($extension);
        return $mimeTypes[$extension] ?? 'image/jpeg';
    }
}