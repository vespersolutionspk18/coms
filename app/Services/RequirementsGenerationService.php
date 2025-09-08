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
     * Process documents with Gemini AI to extract project requirements using a layered approach
     */
    public function generateRequirementsFromDocuments($documents, $progressCallback = null)
    {
        // Increase time limit for API calls
        set_time_limit(1800); // 30 minutes for multi-step process with many types
        
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
            
            // Send progress update
            if ($progressCallback) {
                $progressCallback([
                    'type' => 'progress',
                    'stage' => 'analyzing',
                    'message' => 'Analyzing document content...',
                    'progress' => 10
                ]);
            }
            
            // Step 1: Identify requirement types
            Log::info('Step 1: Identifying requirement types from documents');
            
            if ($progressCallback) {
                $progressCallback([
                    'type' => 'progress',
                    'stage' => 'identifying_types',
                    'message' => 'Identifying requirement categories...',
                    'progress' => 15
                ]);
            }
            
            $requirementTypes = $this->identifyRequirementTypes($combinedContent);
            
            if (!$requirementTypes['success']) {
                return $requirementTypes;
            }
            
            Log::info('Requirement types identified', [
                'types' => $requirementTypes['data']
            ]);
            
            // Delay after type identification to avoid rapid API calls
            sleep(2);
            
            $totalTypes = count($requirementTypes['data']);
            
            if ($progressCallback) {
                $progressCallback([
                    'type' => 'progress',
                    'stage' => 'types_identified',
                    'message' => "Found {$totalTypes} requirement categories to analyze",
                    'progress' => 20,
                    'total_types' => $totalTypes
                ]);
            }
            
            // Step 2 & 3: Extract requirements for each type and aggregate
            $allRequirements = [];
            $processedTypes = 0;
            $lastPingTime = time();
            
            foreach ($requirementTypes['data'] as $type) {
                $processedTypes++;
                $progressPercent = 20 + (($processedTypes / $totalTypes) * 70); // 20-90% range
                
                // Send keepalive ping every 10 seconds
                if ($progressCallback && (time() - $lastPingTime) > 10) {
                    $progressCallback([
                        'type' => 'ping',
                        'message' => 'Processing...'
                    ]);
                    $lastPingTime = time();
                }
                
                if ($progressCallback) {
                    $progressCallback([
                        'type' => 'progress',
                        'stage' => 'extracting',
                        'message' => "Extracting {$type} requirements ({$processedTypes}/{$totalTypes})...",
                        'progress' => $progressPercent,
                        'current_type' => $type,
                        'processed_types' => $processedTypes,
                        'total_types' => $totalTypes
                    ]);
                }
                
                Log::info("Step 2: Extracting requirements for type: {$type}");
                
                // Try extraction with retry logic
                $typeRequirements = $this->extractRequirementsForTypeWithRetry($combinedContent, $type, $progressCallback);
                
                if ($typeRequirements['success'] && !empty($typeRequirements['data'])) {
                    $allRequirements = array_merge($allRequirements, $typeRequirements['data']);
                    
                    Log::info('Requirements extracted for type', [
                        'type' => $type,
                        'count' => count($typeRequirements['data'])
                    ]);
                    
                    if ($progressCallback) {
                        $progressCallback([
                            'type' => 'progress',
                            'stage' => 'extracted_type',
                            'message' => "Extracted " . count($typeRequirements['data']) . " {$type} requirements",
                            'progress' => $progressPercent,
                            'current_type' => $type,
                            'extracted_count' => count($typeRequirements['data']),
                            'total_extracted' => count($allRequirements)
                        ]);
                    }
                } else {
                    // Log but continue with other types
                    Log::warning("Failed to extract requirements for type: {$type}", [
                        'error' => $typeRequirements['error'] ?? 'Unknown error'
                    ]);
                }
                
                // Delay between API calls to ensure SERIAL processing and avoid quota issues
                sleep(2); // 2 second delay between each type to ensure serial processing
            }
            
            // Add metadata to requirements
            $allRequirements = array_map(function($req) {
                return array_merge($req, [
                    'status' => 'Pending',
                    'id' => uniqid('req_'),
                    'created_at' => now()->toISOString()
                ]);
            }, $allRequirements);
            
            Log::info('Step 3: All requirements aggregated successfully', [
                'document_count' => count($documents),
                'requirement_count' => count($allRequirements),
                'types' => array_unique(array_column($allRequirements, 'type'))
            ]);
            
            return [
                'success' => true,
                'data' => $allRequirements
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
     * Step 1: Identify requirement types from documents
     */
    private function identifyRequirementTypes($documentContent)
    {
        try {
            // Define schema for requirement types
            $typeSchema = new Schema(
                type: DataType::OBJECT,
                properties: [
                    'types' => new Schema(
                        type: DataType::ARRAY,
                        items: new Schema(
                            type: DataType::STRING,
                            description: 'Requirement category type'
                        ),
                        description: 'List of requirement types found in the document'
                    )
                ],
                required: ['types']
            );
            
            // Prompt to identify requirement types only
            $prompt = "You are a senior BD (Business Development) manager analyzing a tender document for BIDDING QUALIFICATIONS.

Your task is to identify ONLY the TYPES/CATEGORIES of requirements present in this document that determine if we QUALIFY TO BID.
DO NOT extract the actual requirements - just identify what categories exist.
These are requirements to QUALIFY FOR BIDDING, NOT project deliverables.

Analyze the document thoroughly and identify ALL distinct requirement categories present.

IMPORTANT CONTEXT: This is for a BIDDING/TENDER process. We are looking for:
- Requirements to QUALIFY to bid
- Requirements for PREQUALIFICATION
- Requirements that determine ELIGIBILITY
- NOT deliverables or scope items

IMPORTANT DISTINCTIONS:
- 'Financial' = BIDDING qualification financials (turnover, EMD, bank guarantees to BID), NOT financial deliverables
- 'Experience' = COMPANY/FIRM track record to qualify, NOT experience to deliver
- 'Personnel' = KEY TEAM MEMBERS needed to qualify, NOT all project staff

Common categories include (but are not limited to):
- Financial (minimum turnover to BID, EMD, bid bonds)
- Experience (FIRM's past projects to QUALIFY, years in business)  
- Personnel (KEY POSITIONS for qualification, certifications to BID)
- Technical (technical capabilities to QUALIFY)
- Compliance (regulatory requirements to BID)
- Legal (registrations to be ELIGIBLE)
- Operational (operational capacity to QUALIFY)
- Quality (ISO certifications to BID)
- Environmental (environmental clearances to BID)
- Safety (safety records to QUALIFY)
- Insurance (insurance to BID)
- Geographic (presence requirements to BID)
- Partnership (JV requirements to QUALIFY)
- Security (security clearances to BID)
- Infrastructure (infrastructure to QUALIFY)
- Certification (certifications to BID)
- Any other BIDDING QUALIFICATION categories you identify

Return ONLY the requirement type names that are actually present in the document.
Use clear, descriptive category names (e.g., 'Financial', 'Technical', 'Personnel').
Be comprehensive - identify ALL types of requirements, even if they don't fit standard categories.

Document to analyze:
{$documentContent}";
            
            // Call Gemini API to identify types
            $result = Gemini::generativeModel(model: 'gemini-2.5-flash')
                ->withGenerationConfig(
                    generationConfig: new GenerationConfig(
                        responseMimeType: ResponseMimeType::APPLICATION_JSON,
                        responseSchema: $typeSchema,
                        temperature: 0.2,
                        topP: 0.8,
                        topK: 40
                    )
                )
                ->generateContent($prompt);
            
            // Parse the response
            $typesData = $result->json();
            
            if (is_object($typesData)) {
                $typesData = json_decode(json_encode($typesData), true);
            }
            
            // Ensure we have types
            if (empty($typesData['types'])) {
                return [
                    'success' => false,
                    'error' => 'No requirement types could be identified in the document'
                ];
            }
            
            return [
                'success' => true,
                'data' => $typesData['types']
            ];
            
        } catch (\Exception $e) {
            Log::error('Failed to identify requirement types', [
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => 'Failed to identify requirement types: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Step 2: Extract requirements for a specific type
     */
    private function extractRequirementsForType($documentContent, $type)
    {
        try {
            // Define schema for requirements extraction
            $requirementSchema = new Schema(
                type: DataType::OBJECT,
                properties: [
                    'requirements' => new Schema(
                        type: DataType::ARRAY,
                        items: new Schema(
                            type: DataType::OBJECT,
                            properties: [
                                'type' => new Schema(
                                    type: DataType::STRING,
                                    description: 'Requirement category (should match the provided type)'
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
                        description: 'List of extracted requirements for this type'
                    )
                ],
                required: ['requirements']
            );
            
            // Prepare type-specific extraction prompt
            $typePrompts = $this->getTypeSpecificPrompt($type);
            
            $prompt = "You are a senior BD (Business Development) manager extracting {$type} requirements from a tender document.

{$typePrompts}

IMPORTANT REMINDERS:
- 'Experience' requirements = COMPANY/FIRM/ORGANIZATIONAL level (NOT individual people)
- 'Personnel' requirements = INDIVIDUAL/TEAM MEMBER level (NOT company experience)

Extract ALL {$type} requirements from the document.
Be THOROUGH - extract every requirement related to {$type}.
Be PRECISE - ensure you categorize correctly based on whether it's about the company or individuals.

For each requirement:
- Type: Must be '{$type}'
- Title: Clear, specific requirement name
- Priority: Assess as Critical (mandatory/disqualifying), High (strongly preferred), Medium (preferred), or Low (nice to have)
- Description: Complete description with all specific details, numbers, dates, and conditions

Document to analyze:
{$documentContent}";
            
            // Call Gemini API for this specific type
            $result = Gemini::generativeModel(model: 'gemini-2.5-flash')
                ->withGenerationConfig(
                    generationConfig: new GenerationConfig(
                        responseMimeType: ResponseMimeType::APPLICATION_JSON,
                        responseSchema: $requirementSchema,
                        temperature: 0.3,
                        topP: 0.8,
                        topK: 40
                    )
                )
                ->generateContent($prompt);
            
            // Parse the response
            $requirementsData = $result->json();
            
            if (is_object($requirementsData)) {
                $requirementsData = json_decode(json_encode($requirementsData), true);
            }
            
            return [
                'success' => true,
                'data' => $requirementsData['requirements'] ?? []
            ];
            
        } catch (\Exception $e) {
            Log::warning('Failed to extract requirements for type', [
                'type' => $type,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => "Failed to extract {$type} requirements"
            ];
        }
    }
    
    /**
     * Extract requirements for a type with retry logic
     */
    private function extractRequirementsForTypeWithRetry($documentContent, $type, $progressCallback = null, $maxRetries = 3)
    {
        $attempt = 0;
        $lastError = null;
        
        while ($attempt < $maxRetries) {
            $attempt++;
            
            try {
                $result = $this->extractRequirementsForType($documentContent, $type);
                
                if ($result['success']) {
                    return $result;
                }
                
                $lastError = $result['error'] ?? 'Unknown error';
                
                // Check if it's a retryable error
                if (str_contains($lastError, 'overloaded') || 
                    str_contains($lastError, 'timeout') || 
                    str_contains($lastError, 'rate limit')) {
                    
                    if ($attempt < $maxRetries) {
                        // Exponential backoff
                        $waitTime = pow(2, $attempt) + rand(0, 1000) / 1000;
                        
                        if ($progressCallback) {
                            $progressCallback([
                                'type' => 'retry',
                                'message' => "API busy, retrying {$type} requirements (attempt {$attempt}/{$maxRetries})...",
                                'wait_time' => $waitTime
                            ]);
                        }
                        
                        Log::warning("Retrying extraction for type: {$type}", [
                            'attempt' => $attempt,
                            'error' => $lastError,
                            'wait_time' => $waitTime
                        ]);
                        
                        sleep(max(3, intval($waitTime))); // Minimum 3 seconds between retries
                        continue;
                    }
                }
                
                // Non-retryable error or max retries reached
                break;
                
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                
                if ($attempt < $maxRetries) {
                    $waitTime = pow(2, $attempt);
                    
                    if ($progressCallback) {
                        $progressCallback([
                            'type' => 'retry',
                            'message' => "Error occurred, retrying {$type} requirements (attempt {$attempt}/{$maxRetries})...",
                            'wait_time' => $waitTime
                        ]);
                    }
                    
                    sleep(max(3, $waitTime)); // Minimum 3 seconds between retries
                    continue;
                }
                
                break;
            }
        }
        
        // All retries failed
        return [
            'success' => false,
            'error' => "Failed to extract {$type} requirements after {$maxRetries} attempts: {$lastError}"
        ];
    }
    
    /**
     * Get type-specific extraction prompts
     */
    private function getTypeSpecificPrompt($type)
    {
        $prompts = [
            'Financial' => "Focus on BIDDING QUALIFICATION financial requirements such as:
- Minimum annual turnover required to BID
- Bid security/EMD amounts for BIDDING
- Bank guarantee requirements for QUALIFICATION
- Performance bond requirements
- Financial statements required for PREQUALIFICATION
- Credit ratings or financial ratios needed to QUALIFY
- Insurance coverage requirements to BID
- Financial capacity requirements

NOTE: This is about financial requirements to QUALIFY FOR BIDDING, NOT about financial deliverables in the project scope (like financial dashboards, reports, etc.)",
            
            'Experience' => "Focus on FIRM/COMPANY experience requirements such as:
- Years the company has been in business
- Number of similar projects the firm has completed
- Minimum project values the company has handled
- Specific sectors or industries the firm has worked in
- Company/organizational references required
- Past performance of the organization
- Geographic areas where the company has operated
- Volume of work the firm has completed
- Company track record and history
- Organizational capabilities and achievements
NOTE: This is about the COMPANY'S experience, NOT individual team members",
            
            'Personnel' => "Focus on KEY TEAM MEMBERS and personnel requirements such as:
- Specific key positions required (Project Manager, Technical Lead, etc.)
- Minimum qualifications for each key role
- Years of experience for individual team members
- Certifications required for specific personnel
- Number of technical staff required in the team
- Team composition and structure
- Language skills of team members
- Availability commitments of key personnel
- Individual expertise required
- Specific roles that must be filled
NOTE: This is about INDIVIDUAL people and their qualifications, NOT the company's experience",
            
            'Technical' => "Focus on technical requirements such as:
- Technical capabilities required
- Equipment and machinery specifications
- Technology platforms or software
- Methodologies or processes required
- Technical standards compliance
- Infrastructure requirements
- Testing and quality procedures
- Technical documentation requirements",
            
            'Compliance' => "Focus on compliance requirements such as:
- ISO certifications (9001, 14001, 45001, etc.)
- Industry-specific certifications
- Regulatory licenses and permits
- Safety certifications
- Quality certifications
- Environmental compliance
- Data protection compliance
- Statutory compliance requirements",
            
            'Legal' => "Focus on legal requirements such as:
- Company registration requirements
- Tax clearance certificates
- Legal status (LLC, Corporation, etc.)
- Litigation history requirements
- Contract compliance history
- Authorized signatory requirements
- Power of attorney requirements
- Legal documentation required",
            
            'Operational' => "Focus on operational requirements such as:
- Business processes and procedures
- Project management methodologies
- Reporting requirements
- Communication protocols
- Service level agreements
- Delivery timelines
- Geographic presence or offices
- Operational capacity requirements",
            
            'Quality' => "Focus on quality requirements such as:
- Quality management systems
- Quality control procedures
- Testing and inspection requirements
- Defect management processes
- Quality metrics and KPIs
- Quality certifications required
- Quality assurance plans
- Third-party quality audits",
            
            'Environmental' => "Focus on environmental requirements such as:
- Environmental management systems
- Environmental impact assessments
- Sustainability requirements
- Carbon footprint requirements
- Waste management procedures
- Environmental certifications
- Green building requirements
- Environmental compliance history",
            
            'Safety' => "Focus on safety requirements such as:
- Safety management systems
- Safety certifications required
- Accident history requirements
- Safety training requirements
- PPE requirements
- Safety procedures and protocols
- Emergency response plans
- Safety performance metrics",
            
            'Insurance' => "Focus on insurance requirements such as:
- Professional liability insurance
- General liability insurance
- Workers compensation insurance
- Vehicle insurance
- Equipment insurance
- Minimum coverage amounts
- Policy validity periods
- Additional insured requirements",
            
            'Geographic' => "Focus on geographic requirements such as:
- Office locations required
- Regional presence
- Local partnerships
- Distance from project site
- Service area coverage
- Local registration requirements
- Regional experience
- Time zone requirements",
            
            'Partnership' => "Focus on partnership requirements such as:
- Joint venture requirements
- Subcontractor qualifications
- Consortium formation
- Partner company requirements
- Collaboration agreements
- Strategic alliances
- Vendor partnerships
- Technology partnerships",
            
            'Security' => "Focus on security requirements such as:
- Security clearances
- Background checks
- Data security measures
- Physical security requirements
- Cybersecurity certifications
- Access control requirements
- Security protocols
- Confidentiality agreements",
            
            'Infrastructure' => "Focus on infrastructure requirements such as:
- Facility requirements
- Equipment specifications
- IT infrastructure
- Communication systems
- Transportation requirements
- Storage facilities
- Manufacturing capabilities
- Testing facilities",
            
            'Training' => "Focus on training requirements such as:
- Staff training programs
- Certification requirements
- Skill development needs
- Training documentation
- Training frequency
- Training facilities
- Training materials
- Trainer qualifications",
            
            'Communication' => "Focus on communication requirements such as:
- Reporting protocols
- Meeting requirements
- Documentation standards
- Language requirements
- Communication channels
- Response time requirements
- Escalation procedures
- Stakeholder communication",
            
            'Sustainability' => "Focus on sustainability requirements such as:
- Environmental policies
- Social responsibility
- Sustainable practices
- Carbon neutrality
- Waste reduction
- Energy efficiency
- Sustainable sourcing
- ESG compliance"
        ];
        
        // Default prompt for any type not explicitly defined
        $defaultPrompt = "Extract ALL requirements related to {$type}.
Focus on identifying every requirement that falls under the {$type} category.
Be thorough and comprehensive - include:
- All specific criteria, thresholds, or standards
- Any quantities, percentages, or numerical requirements
- All deadlines, timeframes, or duration requirements
- Any certifications, qualifications, or credentials needed
- All documentation or proof required
- Any conditions, restrictions, or limitations
- All mandatory vs optional elements

Include all specific details, numbers, dates, and conditions exactly as stated in the document.";
        
        // Use specific prompt if available, otherwise use the enhanced default
        return $prompts[ucfirst(strtolower($type))] ?? str_replace('{$type}', $type, $defaultPrompt);
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