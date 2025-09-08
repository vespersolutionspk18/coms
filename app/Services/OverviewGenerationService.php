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
use Carbon\Carbon;
use Smalot\PdfParser\Parser as PdfParser;

class OverviewGenerationService
{
    /**
     * Process advertisement file (image or document) with Gemini AI to extract project information
     */
    public function generateOverviewFromFile($fileData, $mimeType = 'image/jpeg', $fileName = null)
    {
        // Determine if this is an image or document and route accordingly
        if (str_starts_with($mimeType, 'image/')) {
            return $this->generateOverviewFromImage($fileData, $mimeType);
        } else {
            return $this->generateOverviewFromDocument($fileData, $mimeType, $fileName);
        }
    }
    
    /**
     * Process advertisement document (PDF, DOC, DOCX) by extracting text and analyzing with Gemini AI
     */
    public function generateOverviewFromDocument($fileData, $mimeType, $fileName = null)
    {
        try {
            $extractedText = null;
            
            // Extract text based on file type
            if ($mimeType === 'application/pdf') {
                $extractedText = $this->extractTextFromPdf($fileData);
            } elseif (in_array($mimeType, ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])) {
                $extractedText = $this->extractTextFromWord($fileData, $mimeType);
            } else {
                throw new \Exception('Unsupported document type: ' . $mimeType);
            }
            
            if (!$extractedText || trim($extractedText) === '') {
                throw new \Exception('Could not extract text from document');
            }
            
            // Use text analysis instead of vision
            return $this->analyzeTextWithGemini($extractedText);
            
        } catch (\Exception $e) {
            Log::error('Document overview generation failed', [
                'error' => $e->getMessage(),
                'mimeType' => $mimeType,
                'fileName' => $fileName,
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'error' => 'Failed to generate overview from document: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Process advertisement image with Gemini AI to extract project information
     */
    public function generateOverviewFromImage($imageData, $mimeType = 'image/jpeg')
    {
        try {
            // Convert mime type string to Gemini MimeType enum
            $geminiMimeType = $this->getGeminiMimeType($mimeType);
            
            // Define the JSON schema for the response
            $responseSchema = new Schema(
                type: DataType::OBJECT,
                properties: [
                    'title' => new Schema(
                        type: DataType::STRING,
                        description: 'Project title or tender name'
                    ),
                    'client' => new Schema(
                        type: DataType::STRING,
                        description: 'Client or organization issuing the tender'
                    ),
                    'client_email' => new Schema(
                        type: DataType::STRING,
                        description: 'Client contact email address if mentioned'
                    ),
                    'client_phone' => new Schema(
                        type: DataType::STRING,
                        description: 'Client contact phone number if mentioned'
                    ),
                    'documents_procurement' => new Schema(
                        type: DataType::STRING,
                        description: 'Where to obtain RFP/tender documents (website URL, office address, or procurement portal)'
                    ),
                    'sector' => new Schema(
                        type: DataType::STRING,
                        description: 'Industry sector (e.g., Construction, IT, Healthcare, Infrastructure)'
                    ),
                    'bid_security' => new Schema(
                        type: DataType::STRING,
                        description: 'Bid security amount if mentioned'
                    ),
                    'scope_of_work' => new Schema(
                        type: DataType::ARRAY,
                        items: new Schema(type: DataType::STRING),
                        description: 'List of main work items or deliverables'
                    ),
                    'submission_date' => new Schema(
                        type: DataType::STRING,
                        description: 'Tender submission deadline in YYYY-MM-DD format'
                    ),
                    'pre_bid_date' => new Schema(
                        type: DataType::STRING,
                        description: 'Pre-bid meeting date in YYYY-MM-DD format if mentioned'
                    ),
                    'status' => new Schema(
                        type: DataType::STRING,
                        description: 'Project status: Active, On Hold, or Closed'
                    ),
                    'stage' => new Schema(
                        type: DataType::STRING,
                        description: 'Project stage: Identification, Pre-Bid, Proposal, Award, or Implementation'
                    )
                ],
                required: ['title', 'client', 'sector', 'scope_of_work', 'status', 'stage']
            );

            // Prepare the prompt
            $prompt = "You are a professional tender document analyst. Analyze this tender advertisement image and extract the following information:

1. Project Title: The main title or name of the tender/project
2. Client: The organization or entity issuing the tender
3. Client Email: Extract any email addresses mentioned for the client or procurement contact (return null if not found)
4. Client Phone: Extract any phone numbers mentioned for the client or procurement contact (return null if not found)
5. Documents Procurement: WHERE to obtain the RFP/tender documents - format this as HTML with proper links and formatting. Look for website URLs (make them clickable <a> tags), procurement portals, office addresses, or instructions on how/where to get the bid documents. Example formats: 'Download from <a href=\"https://example.com/tenders\">procurement portal</a>' or 'Contact procurement office at <b>procurement@client.com</b>' or 'Available at <b>Main Office, 123 Street</b>'. Use HTML tags like <a>, <b>, <br> for formatting
6. Sector: The industry sector (Construction, IT, Healthcare, Infrastructure, etc.)
7. Bid Security: The bid security amount if mentioned (return null if not found)
8. Scope of Work: List the main deliverables, work items, or services required (as an array)
9. Submission Date: The tender submission deadline (format as YYYY-MM-DD, return null if not found)
10. Pre-bid Date: The pre-bid meeting date if mentioned (format as YYYY-MM-DD, return null if not found)
11. Status: Determine if the tender is 'Active' (submission date in future), 'Closed' (submission date passed), or 'On Hold'
12. Stage: Based on the dates and information, determine the stage: 'Identification' (just announced), 'Pre-Bid' (pre-bid meeting upcoming), 'Proposal' (preparing proposal), 'Award' (winner selected), or 'Implementation' (work in progress)

Pay special attention to the Documents Procurement field - this should contain HTML-formatted information about WHERE to get the tender documents, not what documents are required. Look for URLs (convert to clickable links), addresses (bold them), contact information (format nicely), or procurement portal references. Use proper HTML formatting to make the information clear and actionable.

Extract as much relevant information as possible from the image. If certain information is not available, use null for that field. Be thorough and professional in your analysis.";

            // Call Gemini API with structured output (using Gemini 2.5 Flash as specified)
            $result = Gemini::generativeModel(model: 'gemini-2.5-flash')
                ->withGenerationConfig(
                    generationConfig: new GenerationConfig(
                        responseMimeType: ResponseMimeType::APPLICATION_JSON,
                        responseSchema: $responseSchema,
                        temperature: 0.3, // Lower temperature for more consistent extraction
                        topP: 0.8,
                        topK: 40
                    )
                )
                ->generateContent([
                    $prompt,
                    new Blob(
                        mimeType: $geminiMimeType,
                        data: base64_encode($imageData)
                    )
                ]);

            // Parse the JSON response (convert to array)
            $extractedData = $result->json();
            
            // Convert stdClass to array if needed
            if (is_object($extractedData)) {
                $extractedData = json_decode(json_encode($extractedData), true);
            }
            
            // Process dates to ensure proper format
            if (isset($extractedData['submission_date']) && $extractedData['submission_date']) {
                $extractedData['submission_date'] = $this->formatDate($extractedData['submission_date']);
            }
            
            if (isset($extractedData['pre_bid_date']) && $extractedData['pre_bid_date']) {
                $extractedData['pre_bid_expected_date'] = $this->formatDate($extractedData['pre_bid_date']);
                unset($extractedData['pre_bid_date']);
            }
            
            // Ensure scope_of_work is an array
            if (isset($extractedData['scope_of_work']) && !is_array($extractedData['scope_of_work'])) {
                $extractedData['scope_of_work'] = [$extractedData['scope_of_work']];
            }
            
            // Add timestamp
            $extractedData['generated_at'] = now()->toISOString();
            
            Log::info('Overview generated successfully', ['data' => $extractedData]);
            
            return [
                'success' => true,
                'data' => $extractedData
            ];
            
        } catch (\Exception $e) {
            Log::error('Overview generation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'error' => 'Failed to generate overview: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Convert mime type string to Gemini MimeType enum
     */
    private function getGeminiMimeType($mimeType)
    {
        $mimeMap = [
            'image/jpeg' => MimeType::IMAGE_JPEG,
            'image/jpg' => MimeType::IMAGE_JPEG,
            'image/png' => MimeType::IMAGE_PNG,
            'image/webp' => MimeType::IMAGE_WEBP,
            'image/heic' => MimeType::IMAGE_HEIC,
            'image/heif' => MimeType::IMAGE_HEIF,
        ];
        
        // Default to JPEG for unsupported types like GIF and SVG
        return $mimeMap[$mimeType] ?? MimeType::IMAGE_JPEG;
    }
    
    /**
     * Format date string to YYYY-MM-DD format
     */
    private function formatDate($dateString)
    {
        if (!$dateString) {
            return null;
        }
        
        try {
            $date = Carbon::parse($dateString);
            return $date->format('Y-m-d');
        } catch (\Exception $e) {
            Log::warning('Date parsing failed', ['date' => $dateString, 'error' => $e->getMessage()]);
            return null;
        }
    }
    
    /**
     * Extract text from PDF file
     */
    private function extractTextFromPdf($fileData)
    {
        try {
            $parser = new PdfParser();
            $pdf = $parser->parseContent($fileData);
            $text = $pdf->getText();
            return $text;
        } catch (\Exception $e) {
            Log::error('PDF text extraction failed', ['error' => $e->getMessage()]);
            throw new \Exception('Failed to extract text from PDF: ' . $e->getMessage());
        }
    }
    
    /**
     * Extract text from Word document
     */
    private function extractTextFromWord($fileData, $mimeType)
    {
        try {
            // Create temporary file
            $tempFile = tempnam(sys_get_temp_dir(), 'word_extract_');
            file_put_contents($tempFile, $fileData);
            
            $text = '';
            
            if ($mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                // DOCX file - extract from XML
                $zip = new \ZipArchive();
                if ($zip->open($tempFile)) {
                    $xmlContent = $zip->getFromName('word/document.xml');
                    if ($xmlContent) {
                        $xml = simplexml_load_string($xmlContent);
                        if ($xml) {
                            $xml->registerXPathNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main');
                            $textNodes = $xml->xpath('//w:t');
                            foreach ($textNodes as $textNode) {
                                $text .= (string)$textNode . ' ';
                            }
                        }
                    }
                    $zip->close();
                }
            } else {
                // DOC file - basic extraction (limited support)
                $text = file_get_contents($tempFile);
                // Remove binary characters and keep only readable text
                $text = preg_replace('/[^\x20-\x7E\x0A\x0D]/', ' ', $text);
                $text = preg_replace('/\s+/', ' ', $text);
            }
            
            // Clean up
            unlink($tempFile);
            
            return trim($text);
            
        } catch (\Exception $e) {
            Log::error('Word text extraction failed', ['error' => $e->getMessage()]);
            throw new \Exception('Failed to extract text from Word document: ' . $e->getMessage());
        }
    }
    
    /**
     * Analyze extracted text with Gemini AI
     */
    private function analyzeTextWithGemini($text)
    {
        try {
            // Define the JSON schema for the response (same as image analysis)
            $responseSchema = new Schema(
                type: DataType::OBJECT,
                properties: [
                    'title' => new Schema(
                        type: DataType::STRING,
                        description: 'Project title or tender name'
                    ),
                    'client' => new Schema(
                        type: DataType::STRING,
                        description: 'Client or organization issuing the tender'
                    ),
                    'client_email' => new Schema(
                        type: DataType::STRING,
                        description: 'Client contact email address if mentioned'
                    ),
                    'client_phone' => new Schema(
                        type: DataType::STRING,
                        description: 'Client contact phone number if mentioned'
                    ),
                    'documents_procurement' => new Schema(
                        type: DataType::STRING,
                        description: 'Where to obtain RFP/tender documents (website URL, office address, or procurement portal)'
                    ),
                    'sector' => new Schema(
                        type: DataType::STRING,
                        description: 'Industry sector (e.g., Construction, IT, Healthcare, Infrastructure)'
                    ),
                    'bid_security' => new Schema(
                        type: DataType::STRING,
                        description: 'Bid security amount if mentioned'
                    ),
                    'scope_of_work' => new Schema(
                        type: DataType::ARRAY,
                        items: new Schema(type: DataType::STRING),
                        description: 'List of main work items or deliverables'
                    ),
                    'submission_date' => new Schema(
                        type: DataType::STRING,
                        description: 'Tender submission deadline in YYYY-MM-DD format'
                    ),
                    'pre_bid_date' => new Schema(
                        type: DataType::STRING,
                        description: 'Pre-bid meeting date in YYYY-MM-DD format if mentioned'
                    ),
                    'status' => new Schema(
                        type: DataType::STRING,
                        description: 'Project status: Active, On Hold, or Closed'
                    ),
                    'stage' => new Schema(
                        type: DataType::STRING,
                        description: 'Project stage: Identification, Pre-Bid, Proposal, Award, or Implementation'
                    )
                ],
                required: ['title', 'client', 'sector', 'scope_of_work', 'status', 'stage']
            );

            // Prepare the prompt for text analysis
            $prompt = "You are a professional tender document analyst. Analyze this tender advertisement text and extract the following information:

1. Project Title: The main title or name of the tender/project
2. Client: The organization or entity issuing the tender
3. Client Email: Extract any email addresses mentioned for the client or procurement contact (return null if not found)
4. Client Phone: Extract any phone numbers mentioned for the client or procurement contact (return null if not found)
5. Documents Procurement: WHERE to obtain the RFP/tender documents - format this as HTML with proper links and formatting. Look for website URLs (make them clickable <a> tags), procurement portals, office addresses, or instructions on how/where to get the bid documents. Example formats: 'Download from <a href=\"https://example.com/tenders\">procurement portal</a>' or 'Contact procurement office at <b>procurement@client.com</b>' or 'Available at <b>Main Office, 123 Street</b>'. Use HTML tags like <a>, <b>, <br> for formatting
6. Sector: The industry sector (Construction, IT, Healthcare, Infrastructure, etc.)
7. Bid Security: The bid security amount if mentioned (return null if not found)
8. Scope of Work: List the main deliverables, work items, or services required (as an array)
9. Submission Date: The tender submission deadline (format as YYYY-MM-DD, return null if not found)
10. Pre-bid Date: The pre-bid meeting date if mentioned (format as YYYY-MM-DD, return null if not found)
11. Status: Determine if the tender is 'Active' (submission date in future), 'Closed' (submission date passed), or 'On Hold'
12. Stage: Based on the dates and information, determine the stage: 'Identification' (just announced), 'Pre-Bid' (pre-bid meeting upcoming), 'Proposal' (preparing proposal), 'Award' (winner selected), or 'Implementation' (work in progress)

Pay special attention to the Documents Procurement field - this should contain HTML-formatted information about WHERE to get the tender documents, not what documents are required. Look for URLs (convert to clickable links), addresses (bold them), contact information (format nicely), or procurement portal references. Use proper HTML formatting to make the information clear and actionable.

Extract as much relevant information as possible from the text. If certain information is not available, use null for that field. Be thorough and professional in your analysis.

Text to analyze:
" . $text;

            // Call Gemini API with structured output
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

            // Parse the JSON response
            $extractedData = $result->json();
            
            // Convert stdClass to array if needed
            if (is_object($extractedData)) {
                $extractedData = json_decode(json_encode($extractedData), true);
            }
            
            // Process dates to ensure proper format
            if (isset($extractedData['submission_date']) && $extractedData['submission_date']) {
                $extractedData['submission_date'] = $this->formatDate($extractedData['submission_date']);
            }
            
            if (isset($extractedData['pre_bid_date']) && $extractedData['pre_bid_date']) {
                $extractedData['pre_bid_expected_date'] = $this->formatDate($extractedData['pre_bid_date']);
                unset($extractedData['pre_bid_date']);
            }
            
            // Ensure scope_of_work is an array
            if (isset($extractedData['scope_of_work']) && !is_array($extractedData['scope_of_work'])) {
                $extractedData['scope_of_work'] = [$extractedData['scope_of_work']];
            }
            
            // Add timestamp
            $extractedData['generated_at'] = now()->toISOString();
            
            Log::info('Text overview generated successfully', ['data' => $extractedData]);
            
            return [
                'success' => true,
                'data' => $extractedData
            ];
            
        } catch (\Exception $e) {
            Log::error('Text analysis failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'error' => 'Failed to analyze text: ' . $e->getMessage()
            ];
        }
    }
}