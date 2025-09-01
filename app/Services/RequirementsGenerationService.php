<?php

namespace App\Services;

use Gemini\Laravel\Facades\Gemini;
use Gemini\Data\Blob;
use Gemini\Data\GenerationConfig;
use Gemini\Data\Schema;
use Gemini\Enums\DataType;
use Gemini\Enums\MimeType;
use Gemini\Enums\ResponseMimeType;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser as PdfParser;
use PhpOffice\PhpWord\IOFactory;

class RequirementsGenerationService
{
    /**
     * Process documents with Gemini AI to extract project requirements
     */
    public function generateRequirementsFromDocuments($documents)
    {
        // Increase time limit for API calls
        set_time_limit(120); // 2 minutes
        
        try {
            // Combine all document content
            $combinedContent = '';
            $documentNames = [];
            
            foreach ($documents as $document) {
                $documentPath = $document['file_path'] ?? $document['path'] ?? $document;
                $documentName = $document['name'] ?? basename($documentPath);
                $documentNames[] = $documentName;
                
                // Get file content based on type
                $extension = strtolower(pathinfo($documentPath, PATHINFO_EXTENSION));
                $content = '';
                
                if ($extension === 'pdf') {
                    // Parse PDF content
                    // Try local disk first, then public
                    $fullPath = Storage::disk('local')->path($documentPath);
                    if (!file_exists($fullPath)) {
                        $fullPath = Storage::disk('public')->path($documentPath);
                    }
                    
                    if (file_exists($fullPath)) {
                        $parser = new PdfParser();
                        $pdf = $parser->parseFile($fullPath);
                        $content = $pdf->getText();
                    }
                } elseif (in_array($extension, ['docx', 'doc'])) {
                    // Handle Word documents
                    // Try local disk first, then public
                    $fullPath = Storage::disk('local')->path($documentPath);
                    if (!file_exists($fullPath)) {
                        $fullPath = Storage::disk('public')->path($documentPath);
                    }
                    
                    if (file_exists($fullPath)) {
                        try {
                            $phpWord = IOFactory::load($fullPath);
                            $content = '';
                            
                            // Extract ALL text from document including tables, lists, etc.
                            $sections = $phpWord->getSections();
                            foreach ($sections as $section) {
                                $elements = $section->getElements();
                                foreach ($elements as $element) {
                                    // Extract text from different element types
                                    $content .= $this->extractTextFromElement($element);
                                }
                            }
                        } catch (\Exception $e) {
                            Log::warning('Failed to parse Word document', [
                                'file' => $documentPath,
                                'error' => $e->getMessage()
                            ]);
                            $content = '';
                        }
                    }
                } else {
                    // Read other text-based files
                    // Try local disk first, then public
                    if (Storage::disk('local')->exists($documentPath)) {
                        $content = Storage::disk('local')->get($documentPath);
                    } elseif (Storage::disk('public')->exists($documentPath)) {
                        $content = Storage::disk('public')->get($documentPath);
                    }
                }
                
                if ($content) {
                    $combinedContent .= "\n\n--- Document: {$documentName} ---\n";
                    $combinedContent .= $content;
                }
            }
            
            if (empty($combinedContent)) {
                return [
                    'success' => false,
                    'error' => 'No readable content found in the selected documents'
                ];
            }
            
            // Define the JSON schema for the response
            $responseSchema = new Schema(
                type: DataType::OBJECT,
                properties: [
                    'requirements' => new Schema(
                        type: DataType::ARRAY,
                        items: new Schema(
                            type: DataType::OBJECT,
                            properties: [
                                'type' => new Schema(
                                    type: DataType::STRING,
                                    description: 'Requirement category'
                                ),
                                'title' => new Schema(
                                    type: DataType::STRING,
                                    description: 'Specific requirement title'
                                ),
                                'priority' => new Schema(
                                    type: DataType::STRING,
                                    enum: ['Critical', 'High', 'Medium', 'Low'],
                                    description: 'Priority level of the requirement'
                                ),
                                'description' => new Schema(
                                    type: DataType::STRING,
                                    description: 'Detailed description of the requirement'
                                )
                            ],
                            required: ['type', 'title', 'priority', 'description']
                        ),
                        description: 'List of extracted requirements'
                    )
                ],
                required: ['requirements']
            );

            // Prepare prompt for GO/NO-GO decision checklist
            $prompt = "You are a senior BD (Business Development) manager preparing a GO/NO-GO decision checklist for management.
Extract ONLY the KEY QUALIFYING REQUIREMENTS that determine if we should bid on this tender.

Focus on HIGH-LEVEL requirements that affect the bid/no-bid decision:

1. **FINANCIAL CAPABILITY**
   - Minimum annual turnover required (if specified)
   - Bid security/EMD amount
   - Bank guarantee requirements
   - Performance bond requirements

2. **EXPERIENCE & TRACK RECORD**
   - Years in business required
   - Number of similar projects needed
   - Minimum project values handled
   - Specific sector experience required

3. **KEY PERSONNEL**
   - Critical roles that must be filled (e.g., Project Manager with X years)
   - Essential certifications for key staff
   - Number of technical staff required

4. **MANDATORY CERTIFICATIONS**
   - ISO certifications required
   - Industry-specific licenses
   - Regulatory registrations needed

5. **TECHNICAL CAPABILITY**
   - Core technical competencies required
   - Essential equipment/infrastructure
   - Proprietary technology or methodologies needed

6. **BUSINESS QUALIFICATIONS**
   - Company registration requirements
   - Tax clearance requirements
   - Legal status requirements
   - Geographic presence requirements

Extract ONLY requirements that would be GO/NO-GO factors - things that would disqualify us if we don't have them.
Keep it concise - this is a checklist for executives to make a quick bid/no-bid decision.

For each requirement:
- Type: Use simple categories (Financial, Experience, Personnel, Compliance, Technical, Legal)
- Title: Short, clear requirement name (e.g., 'Annual Turnover', 'ISO 9001', 'Project Manager')
- Priority: Critical (mandatory/disqualifying) or High (strongly preferred)
- Description: One-line description with specific numbers/requirements

Aim for 10-20 KEY requirements maximum - just the deal-breakers and major qualifiers.
This is an executive summary, not a detailed analysis.

Document to analyze:
{$combinedContent}";

            // Call Gemini API with structured output
            // Use try-catch to handle timeout and API errors gracefully
            try {
                $result = Gemini::generativeModel(model: 'gemini-2.5-flash')
                    ->withGenerationConfig(
                        generationConfig: new GenerationConfig(
                            responseMimeType: ResponseMimeType::APPLICATION_JSON,
                            responseSchema: $responseSchema,
                            temperature: 0.3,
                            topP: 0.8,
                            topK: 40
                        )
                    )
                    ->generateContent($prompt);
            } catch (\Exception $apiException) {
                // Log the specific API error
                Log::warning('Gemini API call failed', [
                    'error' => $apiException->getMessage()
                ]);
                
                // Check if it's a timeout or overload issue
                if (str_contains($apiException->getMessage(), 'overloaded') || 
                    str_contains($apiException->getMessage(), 'timeout')) {
                    throw $apiException; // Re-throw to be handled by outer catch
                }
                
                // For other errors, try with a simpler prompt
                throw new \Exception('Failed to process documents. The AI service encountered an error.');
            }

            // Parse the JSON response - handle cases where Gemini doesn't return valid JSON
            try {
                $extractedData = $result->json();
                
                // Convert stdClass to array if needed
                if (is_object($extractedData)) {
                    $extractedData = json_decode(json_encode($extractedData), true);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to parse Gemini response as JSON', [
                    'error' => $e->getMessage()
                ]);
                
                // Try to get text response and parse it manually
                try {
                    $text = $result->text();
                    // Attempt to extract JSON from text if present
                    if (preg_match('/\{.*\}/s', $text, $matches)) {
                        $extractedData = json_decode($matches[0], true);
                    } else {
                        throw new \Exception('No valid JSON found in response');
                    }
                } catch (\Exception $textError) {
                    // If all else fails, return empty requirements
                    Log::error('Could not parse Gemini response', [
                        'error' => $textError->getMessage()
                    ]);
                    return [
                        'success' => false,
                        'error' => 'The AI service returned an invalid response. Please try again.'
                    ];
                }
            }
            
            // Add status field to each requirement and ensure proper structure
            if (isset($extractedData['requirements']) && is_array($extractedData['requirements'])) {
                $extractedData['requirements'] = array_map(function($req) {
                    return array_merge($req, [
                        'status' => 'Pending',
                        'id' => uniqid('req_'),
                        'created_at' => now()->toISOString()
                    ]);
                }, $extractedData['requirements']);
            }
            
            Log::info('Requirements generated successfully', [
                'document_count' => count($documents),
                'requirement_count' => count($extractedData['requirements'] ?? [])
            ]);
            
            return [
                'success' => true,
                'data' => $extractedData['requirements'] ?? []
            ];
            
        } catch (\Exception $e) {
            Log::error('Requirements generation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Handle specific Gemini errors
            $errorMessage = $e->getMessage();
            if (str_contains($errorMessage, 'overloaded')) {
                $errorMessage = 'The AI service is currently busy. Please try again in a few moments.';
            } elseif (str_contains($errorMessage, 'quota')) {
                $errorMessage = 'AI service quota exceeded. Please try again later.';
            } elseif (str_contains($errorMessage, 'rate limit')) {
                $errorMessage = 'Too many requests. Please wait a moment before trying again.';
            }
            
            return [
                'success' => false,
                'error' => $errorMessage
            ];
        }
    }
    
    /**
     * Helper method to extract text from PHPWord elements recursively
     */
    private function extractTextFromElement($element)
    {
        $text = '';
        
        // Handle Text elements
        if (method_exists($element, 'getText')) {
            $elementText = $element->getText();
            if (is_string($elementText)) {
                $text .= $elementText . "\n";
            } elseif (is_object($elementText) && method_exists($elementText, '__toString')) {
                $text .= (string)$elementText . "\n";
            }
        }
        
        // Handle TextRun elements
        if (method_exists($element, 'getElements')) {
            foreach ($element->getElements() as $childElement) {
                $text .= $this->extractTextFromElement($childElement);
            }
        }
        
        // Handle Table elements
        if ($element instanceof \PhpOffice\PhpWord\Element\Table) {
            foreach ($element->getRows() as $row) {
                foreach ($row->getCells() as $cell) {
                    foreach ($cell->getElements() as $cellElement) {
                        $text .= $this->extractTextFromElement($cellElement) . " | ";
                    }
                    $text .= "\n";
                }
            }
        }
        
        // Handle ListItem elements
        if ($element instanceof \PhpOffice\PhpWord\Element\ListItem) {
            $text .= "• " . $element->getTextObject()->getText() . "\n";
        }
        
        return $text;
    }
}