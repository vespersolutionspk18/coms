import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileText, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
        if (selectedDocumentIds.length > 0) {
            onGenerate(selectedDocumentIds);
        }
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
                
                <div className="space-y-4">
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