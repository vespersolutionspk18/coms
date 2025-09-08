import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import axios from '@/lib/axios';

interface Document {
    id: number;
    name: string;
    path: string;
    size?: number;
    created_at?: string;
    uploaded_by?: {
        name: string;
    };
}

interface DocumentSelectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: number;
    onGenerate: (selectedDocumentIds: number[]) => void;
    loading?: boolean;
}

export default function DocumentSelectionModal({
    open,
    onOpenChange,
    projectId,
    onGenerate,
    loading = false
}: DocumentSelectionModalProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [progressData, setProgressData] = useState<{
        show: boolean;
        progress: number;
        message: string;
        stage?: string;
        totalTypes?: number;
        processedTypes?: number;
        totalExtracted?: number;
        error?: string;
    }>({
        show: false,
        progress: 0,
        message: ''
    });

    useEffect(() => {
        if (open && projectId) {
            fetchDocuments();
        }
    }, [open, projectId]);

    const fetchDocuments = async () => {
        setLoadingDocuments(true);
        try {
            const response = await axios.get('/documents', {
                params: {
                    project_id: projectId
                }
            });
            // Handle paginated response
            const documentsData = response.data.data || response.data || [];
            setDocuments(documentsData);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoadingDocuments(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedDocumentIds.length === filteredDocuments.length) {
            setSelectedDocumentIds([]);
        } else {
            setSelectedDocumentIds(filteredDocuments.map(doc => doc.id));
        }
    };

    const handleDocumentToggle = (documentId: number) => {
        setSelectedDocumentIds(prev => {
            if (prev.includes(documentId)) {
                return prev.filter(id => id !== documentId);
            } else {
                return [...prev, documentId];
            }
        });
    };

    const handleGenerate = () => {
        if (selectedDocumentIds.length === 0) return;
        
        // Show progress bar
        setProgressData({
            show: true,
            progress: 0,
            message: 'Initializing requirement extraction...'
        });
        
        // Create EventSource for SSE (using SSE-specific endpoint)
        const url = `/projects/generate-requirements-sse?${new URLSearchParams({
            project_id: projectId.toString(),
            ...selectedDocumentIds.reduce((acc, id, index) => ({
                ...acc,
                [`document_ids[${index}]`]: id.toString()
            }), {})
        })}`;
        
        const eventSource = new EventSource(url);
        
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'ping':
                    // Keepalive ping, just log it
                    console.log('SSE keepalive ping received');
                    break;
                    
                case 'retry':
                    // Show retry message
                    setProgressData(prev => ({
                        ...prev,
                        message: data.message || 'Retrying...',
                        stage: 'retry'
                    }));
                    break;
                    
                case 'progress':
                    setProgressData({
                        show: true,
                        progress: data.progress || 0,
                        message: data.message || 'Processing...',
                        stage: data.stage,
                        totalTypes: data.total_types,
                        processedTypes: data.processed_types,
                        totalExtracted: data.total_extracted
                    });
                    break;
                    
                case 'complete':
                    setProgressData({
                        show: true,
                        progress: 100,
                        message: data.message || 'Requirements generated successfully!',
                        totalExtracted: data.data?.length
                    });
                    
                    // Close EventSource
                    eventSource.close();
                    
                    // Call the original onGenerate with the data
                    if (data.data) {
                        onGenerate(data.data);
                    }
                    
                    // Hide progress after a delay
                    setTimeout(() => {
                        setProgressData({
                            show: false,
                            progress: 0,
                            message: ''
                        });
                        onOpenChange(false);
                        setSelectedDocumentIds([]);
                        setSearchQuery('');
                    }, 2000);
                    break;
                    
                case 'error':
                    setProgressData({
                        show: true,
                        progress: 0,
                        message: 'Error occurred',
                        error: data.error || 'An unexpected error occurred'
                    });
                    
                    // Close EventSource
                    eventSource.close();
                    
                    // Hide error after delay
                    setTimeout(() => {
                        setProgressData({
                            show: false,
                            progress: 0,
                            message: ''
                        });
                    }, 5000);
                    break;
                    
                case 'end':
                    eventSource.close();
                    break;
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('SSE Error:', error);
            eventSource.close();
            
            setProgressData({
                show: true,
                progress: 0,
                message: 'Connection error',
                error: 'Failed to connect to the server. Please try again.'
            });
            
            setTimeout(() => {
                setProgressData({
                    show: false,
                    progress: 0,
                    message: ''
                });
            }, 5000);
        };
    };

    const getFileIcon = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        const color = extension === 'pdf' ? 'text-red-500' : 'text-blue-500';
        return <FileText className={`h-4 w-4 ${color}`} />;
    };

    const filteredDocuments = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]" aria-describedby="document-selection-description">
                <DialogHeader>
                    <DialogTitle>Select Documents for Requirements Generation</DialogTitle>
                    <p id="document-selection-description" className="text-sm text-gray-500 mt-1">
                        Choose one or more documents to analyze for requirement extraction using AI.
                    </p>
                </DialogHeader>
                
                {/* Progress Section */}
                {progressData.show && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        {progressData.error ? (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{progressData.error}</AlertDescription>
                            </Alert>
                        ) : (
                            <>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium">{progressData.message}</span>
                                    <span className="text-gray-500">{Math.round(progressData.progress)}%</span>
                                </div>
                                <Progress value={progressData.progress} className="h-2" />
                                
                                {/* Additional details */}
                                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                    {progressData.totalTypes && (
                                        <Badge variant="outline" className="text-xs">
                                            {progressData.processedTypes || 0}/{progressData.totalTypes} categories
                                        </Badge>
                                    )}
                                    {progressData.totalExtracted && (
                                        <Badge variant="outline" className="text-xs">
                                            {progressData.totalExtracted} requirements found
                                        </Badge>
                                    )}
                                    {progressData.stage === 'extracting' && (
                                        <div className="flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span>Processing...</span>
                                        </div>
                                    )}
                                    {progressData.stage === 'retry' && (
                                        <div className="flex items-center gap-1 text-yellow-600">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span>Retrying...</span>
                                        </div>
                                    )}
                                    {progressData.progress === 100 && (
                                        <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle2 className="h-3 w-3" />
                                            <span>Complete!</span>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
                
                <div className="space-y-4" style={{ display: progressData.show ? 'none' : 'block' }}>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            disabled={loadingDocuments || filteredDocuments.length === 0}
                        >
                            {selectedDocumentIds.length === filteredDocuments.length && filteredDocuments.length > 0
                                ? 'Deselect All'
                                : 'Select All'}
                        </Button>
                    </div>

                    {loadingDocuments ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            <span className="ml-2 text-sm text-gray-500">Loading documents...</span>
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">
                                {searchQuery ? 'No documents found matching your search' : 'No documents uploaded yet'}
                            </p>
                        </div>
                    ) : (
                        <div className="h-[300px] border rounded-md p-4 overflow-y-auto">
                            <div className="space-y-2">
                                {filteredDocuments.map((doc) => (
                                    <div
                                        key={doc.id}
                                        className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                        onClick={() => handleDocumentToggle(doc.id)}
                                    >
                                        <Checkbox
                                            checked={selectedDocumentIds.includes(doc.id)}
                                            onCheckedChange={() => handleDocumentToggle(doc.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                {getFileIcon(doc.name)}
                                                <Label className="text-sm font-medium cursor-pointer">
                                                    {doc.name}
                                                </Label>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                {doc.uploaded_by && (
                                                    <span>Uploaded by {doc.uploaded_by.name}</span>
                                                )}
                                                {doc.created_at && (
                                                    <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedDocumentIds.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                                {selectedDocumentIds.length} document{selectedDocumentIds.length > 1 ? 's' : ''} selected
                            </Badge>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false);
                            setSelectedDocumentIds([]);
                            setSearchQuery('');
                        }}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleGenerate}
                        disabled={loading || selectedDocumentIds.length === 0}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            'Generate Requirements'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}