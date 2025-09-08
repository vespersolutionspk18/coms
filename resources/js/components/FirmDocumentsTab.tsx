import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Upload, FileText, Trash2, Edit2, Download, X, Check, FolderOpen } from 'lucide-react';
import axios from 'axios';

interface Document {
    id: number;
    name: string;
    category: string | null;
    file_path: string;
    uploaded_by: number;
    created_at: string;
    updated_at: string;
    uploadedBy?: {
        name: string;
    };
}

interface FirmDocumentsTabProps {
    firmId: number | null;
    isEditMode: boolean;
    onPendingUpload?: (file: File | null, name: string, category: string) => void;
}

export interface FirmDocumentsTabRef {
    uploadPendingDocument: () => Promise<boolean>;
    hasPendingUpload: () => boolean;
}

const FirmDocumentsTab = forwardRef<FirmDocumentsTabRef, FirmDocumentsTabProps>(({ firmId, isEditMode, onPendingUpload }, ref) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingDoc, setEditingDoc] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newDocName, setNewDocName] = useState('');
    const [newDocCategory, setNewDocCategory] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        if (firmId && isEditMode) {
            fetchDocuments();
        }
    }, [firmId, isEditMode]);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        uploadPendingDocument: async () => {
            if (!selectedFile || !firmId || !newDocName) {
                return false;
            }

            setUploading(true);
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('name', newDocName);
            if (newDocCategory) {
                formData.append('category', newDocCategory);
            }

            try {
                const response = await axios.post(`/firms/${firmId}/documents`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                setDocuments([response.data.document, ...documents]);
                setSelectedFile(null);
                setNewDocName('');
                setNewDocCategory('');
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                if (onPendingUpload) {
                    onPendingUpload(null, '', '');
                }
                return true;
            } catch (error) {
                console.error('Error uploading document:', error);
                return false;
            } finally {
                setUploading(false);
            }
        },
        hasPendingUpload: () => {
            return !!selectedFile && !!newDocName;
        }
    }), [selectedFile, firmId, newDocName, newDocCategory, documents, onPendingUpload]);

    const fetchDocuments = async () => {
        if (!firmId) return;
        
        setLoading(true);
        try {
            const response = await axios.get(`/firms/${firmId}/documents`);
            setDocuments(response.data);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (!newDocName) {
                setNewDocName(file.name.replace(/\.[^/.]+$/, ''));
            }
            // Notify parent about pending upload
            if (onPendingUpload) {
                onPendingUpload(file, newDocName || file.name.replace(/\.[^/.]+$/, ''), newDocCategory);
            }
        }
    };


    const handleEdit = (doc: Document) => {
        setEditingDoc(doc.id);
        setEditName(doc.name);
        setEditCategory(doc.category || '');
    };

    const handleSaveEdit = async (doc: Document) => {
        if (!firmId) return;

        try {
            const response = await axios.put(`/firms/${firmId}/documents/${doc.id}`, {
                name: editName,
                category: editCategory || null,
            });

            setDocuments(documents.map(d => 
                d.id === doc.id ? response.data.document : d
            ));
            setEditingDoc(null);
        } catch (error) {
            console.error('Error updating document:', error);
            alert('Failed to update document. Please try again.');
        }
    };

    const handleCancelEdit = () => {
        setEditingDoc(null);
        setEditName('');
        setEditCategory('');
    };

    const handleDelete = async (doc: Document) => {
        if (!firmId) return;
        
        if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
            try {
                await axios.delete(`/firms/${firmId}/documents/${doc.id}`);
                setDocuments(documents.filter(d => d.id !== doc.id));
            } catch (error) {
                console.error('Error deleting document:', error);
                alert('Failed to delete document. Please try again.');
            }
        }
    };

    const handleDownload = async (doc: Document) => {
        try {
            const response = await axios.get(`/documents/${doc.id}/download`, {
                responseType: 'blob',
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', doc.name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading document:', error);
            alert('Failed to download document. Please try again.');
        }
    };

    if (!isEditMode) {
        return (
            <div className="p-6">
                <p className="text-gray-500 text-center">Save the firm to manage documents</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Upload Section */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Upload New Document</h3>
                        {selectedFile && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedFile(null);
                                    setNewDocName('');
                                    setNewDocCategory('');
                                    if (fileInputRef.current) {
                                        fileInputRef.current.value = '';
                                    }
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>

                    {!selectedFile ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Upload className="h-12 w-12 text-gray-400 mb-3" />
                            <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                            <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT, Images, Excel, CSV (MAX. 10MB)</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.xlsx,.xls,.csv"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Select File
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <FileText className="h-5 w-5" />
                                <span className="font-medium">{selectedFile.name}</span>
                                <span className="text-gray-400">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Document Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newDocName}
                                        onChange={(e) => {
                                            setNewDocName(e.target.value);
                                            if (onPendingUpload && selectedFile) {
                                                onPendingUpload(selectedFile, e.target.value, newDocCategory);
                                            }
                                        }}
                                        placeholder="Enter document name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category
                                    </label>
                                    <input
                                        type="text"
                                        value={newDocCategory}
                                        onChange={(e) => {
                                            setNewDocCategory(e.target.value);
                                            if (onPendingUpload && selectedFile) {
                                                onPendingUpload(selectedFile, newDocName, e.target.value);
                                            }
                                        }}
                                        placeholder="e.g., Contract, Report, Certificate"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        setNewDocName('');
                                        setNewDocCategory('');
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                        }
                                        if (onPendingUpload) {
                                            onPendingUpload(null, '', '');
                                        }
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel Selection
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Documents List */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Documents ({documents.length})</h3>
                
                {loading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No documents uploaded yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                            >
                                {editingDoc === doc.id ? (
                                    <div className="flex-1 flex items-center space-x-3">
                                        <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1 px-2 py-1 border border-gray-300 rounded"
                                            placeholder="Document name"
                                        />
                                        <input
                                            type="text"
                                            value={editCategory}
                                            onChange={(e) => setEditCategory(e.target.value)}
                                            className="px-2 py-1 border border-gray-300 rounded"
                                            placeholder="Category"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSaveEdit(doc)}
                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                        >
                                            <Check size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center space-x-3 flex-1">
                                            <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{doc.name}</p>
                                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                                    {doc.category && (
                                                        <span className="px-2 py-1 bg-gray-100 rounded">
                                                            {doc.category}
                                                        </span>
                                                    )}
                                                    <span>
                                                        {new Date(doc.created_at).toLocaleDateString()}
                                                    </span>
                                                    {doc.uploadedBy && (
                                                        <span>by {doc.uploadedBy.name}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => handleDownload(doc)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                title="Download"
                                            >
                                                <Download size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(doc)}
                                                className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(doc)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

FirmDocumentsTab.displayName = 'FirmDocumentsTab';

export default FirmDocumentsTab;