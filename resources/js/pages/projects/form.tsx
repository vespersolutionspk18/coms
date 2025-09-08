import React, { useState, useEffect, useRef } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from '@/lib/axios';
import AppLayout from '@/layouts/app-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import TaskKanban from '@/components/TaskKanban';
import Timeline from '@/components/Timeline';
import DocumentSelectionModal from '@/components/DocumentSelectionModal';
import FirmSelectionModal from '@/components/FirmSelectionModal';
import {
    FileText, Users, CheckSquare, FolderOpen, Building2, Calendar,
    Plus, Edit2, Save, X, ChevronRight, Clock, AlertCircle,
    DollarSign, Briefcase, Target, TrendingUp, Trash2, Eye,
    Download, Upload, Filter, Search, MoreVertical, Link2,
    Kanban, List, CalendarDays, ChevronDown, Sparkles, ChevronUp
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface Project {
    id?: number;
    title: string;
    sector: string | null;
    scope_of_work: string[] | null;
    client: string | null;
    client_email: string | null;
    client_phone: string | null;
    documents_procurement: string | null;
    stage: string | null;
    submission_date: string | null;
    bid_security: string | null;
    status: string | null;
    pre_bid_expected_date: string | null;
    advertisement: string | null;
    created_at?: string;
    updated_at?: string;
    firms?: any[];
    milestones?: any[];
    requirements?: any[];
    tasks?: any[];
    documents?: any[];
}

interface Props {
    project?: Project;
    firms?: any[];
    users?: any[];
}

export default function ProjectForm({ project, firms = [], users = [] }: Props) {
    const { auth } = usePage().props as any;
    
    // Debug initial project data
    useEffect(() => {
        console.log('Initial project prop:', project);
        if (project?.firms) {
            console.log('Initial project firms:', project.firms);
            project.firms.forEach((firm: any) => {
                console.log(`Initial firm ${firm.name}:`, {
                    selectedDocuments: firm.selectedDocuments,
                    selectedDocumentsLength: firm.selectedDocuments?.length,
                    documents: firm.documents,
                    documentsLength: firm.documents?.length,
                    pivot: firm.pivot
                });
            });
        }
    }, [project]); // Watch for project changes
    // Preserve tab state using URL hash or localStorage
    const [activeTab, setActiveTab] = useState(() => {
        // Check URL hash first
        const hash = window.location.hash.replace('#', '');
        if (['overview', 'documents', 'requirements', 'tasks', 'firms', 'milestones'].includes(hash)) {
            return hash;
        }
        // Otherwise check localStorage
        const saved = localStorage.getItem('projectFormActiveTab');
        return saved || 'overview';
    });
    const [taskView, setTaskView] = useState<'kanban' | 'list'>('kanban');
    const [documents, setDocuments] = useState<any[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [documentSearch, setDocumentSearch] = useState('');
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadRequirementId, setUploadRequirementId] = useState<string>('');
    const [editingDocumentId, setEditingDocumentId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const advertisementInputRef = useRef<HTMLInputElement>(null);
    const [advertisementFile, setAdvertisementFile] = useState<File | null>(null);
    const [advertisementPreview, setAdvertisementPreview] = useState<string | null>(null);
    const [removeAdvertisementFlag, setRemoveAdvertisementFlag] = useState(false);
    const [newScope, setNewScope] = useState('');
    const [showAddRequirement, setShowAddRequirement] = useState(false);
    const [newRequirement, setNewRequirement] = useState({
        type: '',
        title: '',
        priority: 'Medium',
        status: 'Pending',
        description: ''
    });
    const [requirements, setRequirements] = useState(Array.isArray(project?.requirements) ? project.requirements : []);
    const [generatingOverview, setGeneratingOverview] = useState(false);
    const [showDocumentSelectionModal, setShowDocumentSelectionModal] = useState(false);
    const [generatingRequirements, setGeneratingRequirements] = useState(false);
    const [showFirmSelectionModal, setShowFirmSelectionModal] = useState(false);
    const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());
    const [expandedFirms, setExpandedFirms] = useState<Set<number>>(new Set());
    const [firmDocuments, setFirmDocuments] = useState<{ [key: number]: any[] }>({});
    const [forceUpdate, setForceUpdate] = useState(0);

    // Fetch documents when project changes or tab is selected
    useEffect(() => {
        if (project?.id && activeTab === 'documents') {
            fetchDocuments();
        }
    }, [project?.id, activeTab]);

    // Set initial advertisement preview if project has one
    useEffect(() => {
        if (project?.advertisement) {
            setAdvertisementPreview(`/storage/${project.advertisement}`);
        }
    }, [project?.advertisement]);
    
    const formatDateForInput = (dateString: string | null | undefined) => {
        if (!dateString) return '';
        // If it's already in yyyy-MM-dd format, return as is
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
        // Otherwise parse and format
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const toggleTypeCollapse = (type: string) => {
        setCollapsedTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(type)) {
                newSet.delete(type);
            } else {
                newSet.add(type);
            }
            return newSet;
        });
    };

    const toggleFirmExpanded = (firmId: number) => {
        setExpandedFirms(prev => {
            const newSet = new Set(prev);
            if (newSet.has(firmId)) {
                newSet.delete(firmId);
            } else {
                newSet.add(firmId);
                // Fetch firm documents if not already loaded
                const firm = data.firms.find((f: any) => f.id === firmId);
                if (firm && (!firm.documents || firm.documents.length === 0) && !firmDocuments[firmId]) {
                    fetchFirmDocuments(firmId);
                }
            }
            return newSet;
        });
    };

    const fetchFirmDocuments = async (firmId: number, skipUpdate: boolean = false) => {
        try {
            const response = await axios.get(`/firms/${firmId}/documents`);
            setFirmDocuments(prev => ({ ...prev, [firmId]: response.data }));
            
            // Only update firms if not skipping (to avoid overwriting during initial add)
            if (!skipUpdate) {
                setData('firms', data.firms.map((f: any) => 
                    f.id === firmId ? { ...f, documents: response.data } : f
                ));
            }
            
            return response.data;
        } catch (error) {
            console.error('Error fetching firm documents:', error);
            return [];
        }
    };

    const toggleFirmDocument = (firmId: number, document: any, isSelected: boolean) => {
        setData('firms', data.firms.map((f: any) => {
            if (f.id === firmId) {
                const selectedDocs = f.selectedDocuments || [];
                if (isSelected) {
                    return { ...f, selectedDocuments: [...selectedDocs, document] };
                } else {
                    return { ...f, selectedDocuments: selectedDocs.filter((d: any) => d.id !== document.id) };
                }
            }
            return f;
        }));
    };

    const { data, setData, post, put, processing, errors } = useForm<any>({
        title: project?.title || '',
        sector: project?.sector || '',
        scope_of_work: Array.isArray(project?.scope_of_work) ? project.scope_of_work : [],
        client: project?.client || '',
        client_email: project?.client_email || '',
        client_phone: project?.client_phone || '',
        documents_procurement: project?.documents_procurement || '',
        stage: project?.stage || 'Identification',
        submission_date: formatDateForInput(project?.submission_date),
        bid_security: project?.bid_security || '',
        status: project?.status || 'Active',
        pre_bid_expected_date: formatDateForInput(project?.pre_bid_expected_date),
        firms: Array.isArray(project?.firms) ? project.firms.map(firm => ({
            ...firm,
            selectedDocuments: firm.selectedDocuments || [],
            documents: firm.documents || []
        })) : [],
        requirements: Array.isArray(project?.requirements) ? project.requirements : [],
    });
    
    // Debug: Log whenever firms data changes
    useEffect(() => {
        console.log('Data.firms changed:', data.firms);
        data.firms.forEach((firm: any) => {
            console.log(`Firm ${firm.name} has ${firm.selectedDocuments?.length || 0} selected documents:`, firm.selectedDocuments);
        });
    }, [data.firms]);

    const addScope = () => {
        if (newScope.trim()) {
            setData('scope_of_work', [...(data.scope_of_work || []), newScope.trim()]);
            setNewScope('');
        }
    };

    const handleAddRequirement = () => {
        if (newRequirement.title.trim()) {
            const requirement = {
                ...newRequirement,
                id: Date.now(),
                created_at: new Date().toISOString()
            };
            const updatedRequirements = [...requirements, requirement];
            setRequirements(updatedRequirements);
            setData('requirements', updatedRequirements);
            setNewRequirement({
                type: '',
                title: '',
                priority: 'Medium',
                status: 'Pending',
                description: ''
            });
            setShowAddRequirement(false);
        }
    };

    const deleteRequirement = (id: number) => {
        const updatedRequirements = requirements.filter((req: any) => req.id !== id);
        setRequirements(updatedRequirements);
        setData('requirements', updatedRequirements);
    };

    const updateRequirementStatus = (id: number, status: string) => {
        const updatedRequirements = requirements.map((req: any) => 
            req.id === id ? { ...req, status } : req
        );
        setRequirements(updatedRequirements);
        setData('requirements', updatedRequirements);
    };

    const removeScope = (index: number) => {
        const scopes = [...(data.scope_of_work || [])];
        scopes.splice(index, 1);
        setData('scope_of_work', scopes);
    };

    const addFirm = (firmId: number) => {
        const firm = firms.find(f => f.id === firmId);
        if (firm && !data.firms.some((f: any) => f.id === firmId)) {
            setData('firms', [...data.firms, { ...firm, pivot: { role_in_project: 'Subconsultant' } }]);
        }
    };

    const handleFirmSelection = async (firm: any) => {
        console.log('handleFirmSelection called with firm:', firm);
        console.log('Current data.firms before update:', data.firms);
        
        if (!data.firms.some((f: any) => f.id === firm.id)) {
            // Fetch documents first
            const documents = await fetchFirmDocuments(firm.id, true);
            
            const newFirm = { 
                ...firm, 
                pivot: { role_in_project: 'Subconsultant' },
                selectedDocuments: [],
                documents: documents
            };
            
            const updatedFirms = [...data.firms, newFirm];
            console.log('Updated firms array with documents:', updatedFirms);
            
            setData('firms', updatedFirms);
            console.log('Called setData with new firms including documents');
        } else {
            console.log('Firm already exists in the list');
        }
        setShowFirmSelectionModal(false);
    };

    const removeFirm = (firmId: number) => {
        setData('firms', data.firms.filter((f: any) => f.id !== firmId));
    };

    const updateFirmRole = (firmId: number, role: string) => {
        setData('firms', data.firms.map((f: any) => 
            f.id === firmId ? { ...f, pivot: { ...f.pivot, role_in_project: role } } : f
        ));
    };

    const handleAdvertisementSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload only image files (JPEG, PNG, JPG, GIF, SVG) or documents (PDF, DOC, DOCX)');
            return;
        }

        setAdvertisementFile(file);
        setRemoveAdvertisementFlag(false); // Reset remove flag when new file selected
        
        // Create preview only for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAdvertisementPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            // For non-image files, set a placeholder or file name
            setAdvertisementPreview(null);
        }
    };

    const removeAdvertisement = () => {
        setAdvertisementFile(null);
        setAdvertisementPreview(null);
        if (advertisementInputRef.current) {
            advertisementInputRef.current.value = '';
        }
        // Mark for removal if editing existing project with an advertisement
        if (project?.advertisement) {
            setRemoveAdvertisementFlag(true);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Prepare the data object with the file
        const submitData: any = {
            ...data,
            scope_of_work: JSON.stringify(data.scope_of_work),
            firms: JSON.stringify(data.firms),
            requirements: JSON.stringify(data.requirements),
        };
        
        // Add advertisement file if present
        if (advertisementFile) {
            submitData.advertisement = advertisementFile;
        }
        
        // Add remove flag if needed
        if (removeAdvertisementFlag) {
            submitData.remove_advertisement = true;
        }
        
        if (!project?.id) {
            router.post('/projects', submitData, {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    // Show success notification
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center gap-2';
                    notification.innerHTML = '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Project created successfully!</span>';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 3000);
                },
                onError: () => {
                    // Show error notification
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
                    notification.textContent = 'Failed to create project. Please check the form.';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 4000);
                }
            });
        } else {
            router.post(`/projects/${project.id}`, {
                ...submitData,
                _method: 'PUT'
            }, {
                preserveScroll: true,
                preserveState: false,
                forceFormData: true,
                onSuccess: () => {
                    setRemoveAdvertisementFlag(false); // Reset flag after successful save
                    // Show success notification
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center gap-2';
                    notification.innerHTML = '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Project saved successfully!</span>';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 3000);
                },
                onError: () => {
                    // Show error notification
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
                    notification.textContent = 'Failed to save project. Please check the form.';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 4000);
                }
            });
        }
    };

    const handleDelete = () => {
        if (project?.id && confirm('Are you sure you want to delete this project?')) {
            router.delete(`/projects/${project.id}`);
        }
    };

    const fetchDocuments = async () => {
        if (!project?.id) return;
        
        setLoadingDocuments(true);
        try {
            const response = await axios.get(`/documents`, {
                params: {
                    project_id: project.id,
                    search: documentSearch
                }
            });
            setDocuments(response.data.data || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoadingDocuments(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !project?.id) return;

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload only PDF or Word documents');
            return;
        }

        setUploadFile(file);
        setShowUploadDialog(true);
    };

    const handleDocumentUpload = async () => {
        if (!uploadFile || !project?.id) {
            console.log('Upload aborted - missing file or project:', { uploadFile: !!uploadFile, projectId: project?.id });
            return;
        }

        console.log('Starting document upload:', { fileName: uploadFile.name, projectId: project.id, requirementId: uploadRequirementId });
        setUploadingDocument(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('project_id', project.id.toString());
        if (uploadRequirementId) {
            formData.append('requirement_id', uploadRequirementId);
        }

        try {
            console.log('Sending upload request...');
            const response = await axios.post('/documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('Upload successful:', response.data);
            
            // Add new document to list
            setDocuments(prev => [response.data.document, ...prev]);
            
            // Clear file input and close dialog
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setUploadFile(null);
            setUploadRequirementId('');
            setShowUploadDialog(false);
        } catch (error: any) {
            console.error('Error uploading document:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            alert(error.response?.data?.message || `Failed to upload document: ${error.message}`);
        } finally {
            setUploadingDocument(false);
        }
    };

    const handleDocumentDelete = async (documentId: number) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            await axios.delete(`/documents/${documentId}`);
            setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Failed to delete document');
        }
    };

    const handleDocumentDownload = (documentId: number, documentName: string) => {
        window.open(`/documents/${documentId}/download`, '_blank');
    };

    const getFileIcon = (fileName: string | null | undefined) => {
        if (!fileName || typeof fileName !== 'string') {
            return <FileText className="h-3 w-3 text-gray-400" />;
        }
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension === 'pdf') {
            return <FileText className="h-3 w-3 text-red-500" />;
        } else if (['doc', 'docx'].includes(extension || '')) {
            return <FileText className="h-3 w-3 text-blue-500" />;
        }
        return <FileText className="h-3 w-3 text-gray-400" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const handleDocumentRequirementUpdate = async (documentId: number, requirementId: string | null) => {
        try {
            const response = await axios.patch(`/documents/${documentId}`, {
                requirement_id: requirementId || null
            });
            
            // Update document in list
            setDocuments(prev => prev.map(doc => 
                doc.id === documentId ? { ...doc, requirement: response.data.document.requirement } : doc
            ));
            
            setEditingDocumentId(null);
        } catch (error) {
            console.error('Error updating document requirement:', error);
            alert('Failed to update document requirement');
        }
    };

    const handleGenerateOverview = async () => {
        // Check if we have an advertisement file
        if (!advertisementPreview && !advertisementFile) {
            alert('Please upload an advertisement document first');
            return;
        }

        setGeneratingOverview(true);
        try {
            const formData = new FormData();
            
            if (advertisementFile) {
                // Send the file directly for both images and documents
                formData.append('file', advertisementFile);
            } else if (advertisementPreview && advertisementPreview.startsWith('data:')) {
                // If we have base64 image data, send it as image
                formData.append('image', advertisementPreview);
            } else if (project?.advertisement) {
                // If we have existing advertisement path, send the path
                formData.append('advertisement_path', project.advertisement);
            } else {
                alert('No file found for analysis');
                setGeneratingOverview(false);
                return;
            }
            
            // Call the API with multipart form data
            const response = await axios.post('/projects/generate-overview', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                const generatedData = response.data.data;
                
                // Update form fields with generated data
                if (generatedData.title) setData('title', generatedData.title);
                if (generatedData.client) setData('client', generatedData.client);
                if (generatedData.client_email) setData('client_email', generatedData.client_email);
                if (generatedData.client_phone) setData('client_phone', generatedData.client_phone);
                if (generatedData.documents_procurement) setData('documents_procurement', generatedData.documents_procurement);
                if (generatedData.sector) setData('sector', generatedData.sector);
                if (generatedData.bid_security) setData('bid_security', generatedData.bid_security);
                if (generatedData.scope_of_work && Array.isArray(generatedData.scope_of_work)) {
                    setData('scope_of_work', generatedData.scope_of_work);
                }
                if (generatedData.submission_date) setData('submission_date', generatedData.submission_date);
                if (generatedData.pre_bid_expected_date) setData('pre_bid_expected_date', generatedData.pre_bid_expected_date);
                if (generatedData.status) setData('status', generatedData.status);
                if (generatedData.stage) setData('stage', generatedData.stage);
                
                // Show success message
                alert('Overview generated successfully! Please review and adjust the extracted information as needed.');
            } else {
                alert('Failed to generate overview: ' + (response.data.error || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Error generating overview:', error);
            alert('Error generating overview: ' + (error.response?.data?.error || error.message || 'Unknown error'));
        } finally {
            setGeneratingOverview(false);
        }
    };

    const handleGenerateRequirements = async (generatedRequirements: any) => {
        if (!project?.id) {
            alert('Please save the project first before generating requirements');
            setShowDocumentSelectionModal(false);
            return;
        }

        // If we receive the requirements directly (from SSE complete event)
        if (Array.isArray(generatedRequirements)) {
            // Merge new requirements with existing ones
            const updatedRequirements = [...requirements, ...generatedRequirements];
            setRequirements(updatedRequirements);
            setData('requirements', updatedRequirements);
            
            // Show success message
            alert(`${generatedRequirements.length} requirements generated successfully! Please review them in the requirements list.`);
            
            // Close the modal (handled by DocumentSelectionModal)
            setGeneratingRequirements(false);
        } else {
            // This shouldn't happen with the new SSE approach
            console.error('Unexpected format for generated requirements');
            setGeneratingRequirements(false);
        }
    };

    const handleClearAllRequirements = async () => {
        if (!project?.id) {
            alert('No project found');
            return;
        }

        if (requirements.length === 0) {
            return;
        }

        // Show confirmation dialog
        if (!confirm(`Are you sure you want to delete all ${requirements.length} requirements? This action cannot be undone.`)) {
            return;
        }

        try {
            // Call backend to delete all requirements
            const response = await axios.delete(`/requirements/clear-all/${project.id}`);
            
            if (response.data.success) {
                // Clear from state
                setRequirements([]);
                setData('requirements', []);
                
                alert('All requirements have been cleared successfully.');
            } else {
                alert('Failed to clear requirements: ' + (response.data.error || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Error clearing requirements:', error);
            alert('Failed to clear requirements: ' + (error.response?.data?.error || error.message || 'Unknown error'));
        }
    };

    const stageColors = {
        'Identification': 'bg-gray-100 text-gray-700',
        'Pre-Bid': 'bg-yellow-100 text-yellow-700',
        'Proposal': 'bg-blue-100 text-blue-700',
        'Award': 'bg-green-100 text-green-700',
        'Implementation': 'bg-purple-100 text-purple-700',
    };

    const statusColors = {
        'Active': 'bg-green-100 text-green-700',
        'Closed': 'bg-gray-100 text-gray-700',
        'On Hold': 'bg-orange-100 text-orange-700',
    };

    const pageTitle = !project?.id ? 'New Project' : (data.title || 'Project');
    
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Projects', href: '/projects' },
                { title: pageTitle }
            ]}
            headerActions={
                <div className="flex items-center gap-2">
                    {project?.id && (
                        <>
                            <Badge className={cn("text-xs", stageColors[data.stage])}>
                                {data.stage}
                            </Badge>
                            <Badge className={cn("text-xs", statusColors[data.status])}>
                                {data.status}
                            </Badge>
                        </>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                        {project?.id && (
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={handleDelete}
                                className="h-6 text-xs px-2"
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                            </Button>
                        )}
                        <Button
                            type="submit"
                            form="project-form"
                            size="sm"
                            disabled={processing}
                            className={cn(
                                "h-6 text-xs px-2 transition-all",
                                processing && "opacity-75"
                            )}
                        >
                            {processing ? (
                                <>
                                    <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-3 w-3 mr-1" />
                                    Save
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            }
        >
            <Head title={pageTitle} />
            
            <form id="project-form" onSubmit={handleSubmit} className="space-y-1 p-2">

                <Tabs value={activeTab} onValueChange={(value) => {
                    setActiveTab(value);
                    // Save to localStorage
                    localStorage.setItem('projectFormActiveTab', value);
                    // Update URL hash without causing navigation
                    window.history.replaceState(null, '', `#${value}`);
                }} className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="requirements">Requirements</TabsTrigger>
                        <TabsTrigger value="tasks">Tasks</TabsTrigger>
                        <TabsTrigger value="firms">Firms</TabsTrigger>
                        <TabsTrigger value="milestones">Timeline</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-3 mt-2">
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="col-span-2">
                                <CardHeader className="px-2 py-1">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm">General Information</CardTitle>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="default"
                                            className="h-6 px-2 bg-black hover:bg-gray-800 text-white"
                                            onClick={handleGenerateOverview}
                                            disabled={generatingOverview}
                                        >
                                            {generatingOverview ? (
                                                <>
                                                    <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                    Generating...
                                                </>
                                            ) : (
                                                'Generate Overview'
                                            )}
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-2 py-1 space-y-0.5">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs">Project Title</Label>
                                            <Input
                                                value={data.title}
                                                onChange={e => setData('title', e.target.value)}
                                                className="h-7 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Client</Label>
                                            <Input
                                                value={data.client || ''}
                                                onChange={e => setData('client', e.target.value)}
                                                className="h-7 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs">Client Email</Label>
                                            <Input
                                                type="email"
                                                value={data.client_email || ''}
                                                onChange={e => setData('client_email', e.target.value)}
                                                className="h-7 text-sm"
                                                placeholder="client@example.com"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Client Phone</Label>
                                            <Input
                                                type="tel"
                                                value={data.client_phone || ''}
                                                onChange={e => setData('client_phone', e.target.value)}
                                                className="h-7 text-sm"
                                                placeholder="+1 234 567 8900"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs">Sector</Label>
                                            <Input
                                                value={data.sector || ''}
                                                onChange={e => setData('sector', e.target.value)}
                                                className="h-7 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Bid Security</Label>
                                            <Input
                                                value={data.bid_security || ''}
                                                onChange={e => setData('bid_security', e.target.value)}
                                                className="h-7 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Scope of Work</Label>
                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                            {(Array.isArray(data.scope_of_work) ? data.scope_of_work : []).map((scope, index) => (
                                                <Badge key={index} variant="secondary" className="text-xs py-0 pr-1 group">
                                                    {scope}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeScope(index)}
                                                        className="ml-1 hover:text-red-600"
                                                    >
                                                        <X className="h-2.5 w-2.5" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                        <div className="flex gap-1 mt-0.5">
                                            <Input
                                                value={newScope}
                                                onChange={e => setNewScope(e.target.value)}
                                                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addScope())}
                                                placeholder="Add scope..."
                                                className="h-6 text-xs"
                                            />
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                onClick={addScope}
                                                className="h-6 px-2"
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Documents Procurement</Label>
                                        <div 
                                            className="mt-1 p-2 bg-gray-50 rounded-md text-sm prose prose-sm max-w-none min-h-[40px]"
                                            dangerouslySetInnerHTML={{ __html: data.documents_procurement || '<span class="text-gray-400">No procurement information available</span>' }}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Advertisement</Label>
                                        <div className="mt-0.5">
                                            {advertisementFile || advertisementPreview ? (
                                                <div className="relative">
                                                    {advertisementPreview ? (
                                                        <a 
                                                            href={advertisementPreview} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="block cursor-pointer hover:opacity-90 transition-opacity"
                                                        >
                                                            <img 
                                                                src={advertisementPreview} 
                                                                alt="Advertisement" 
                                                                className="w-full h-32 object-cover rounded border"
                                                            />
                                                        </a>
                                                    ) : advertisementFile ? (
                                                        <div className="border rounded p-4 bg-gray-50">
                                                            <div className="flex items-center gap-2">
                                                                <FileText className="h-6 w-6 text-gray-400" />
                                                                <div>
                                                                    <p className="text-sm font-medium">{advertisementFile.name}</p>
                                                                    <p className="text-xs text-gray-500">Document uploaded</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="destructive"
                                                        className="absolute top-1 right-1 h-6 w-6 p-0"
                                                        onClick={removeAdvertisement}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
                                                    <input
                                                        ref={advertisementInputRef}
                                                        type="file"
                                                        accept="image/*,.pdf,.doc,.docx"
                                                        onChange={handleAdvertisementSelect}
                                                        className="hidden"
                                                    />
                                                    <Upload className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                                                    <p className="text-xs text-gray-600 mb-1">Upload advertisement document</p>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-6 text-xs px-2"
                                                        onClick={() => advertisementInputRef.current?.click()}
                                                    >
                                                        Choose File
                                                    </Button>
                                                    <p className="text-xs text-gray-500 mt-1">Images (JPEG, PNG, GIF, SVG) or Documents (PDF, DOC, DOCX)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="px-2 py-1">
                                    <CardTitle className="text-sm">Stage & Status</CardTitle>
                                </CardHeader>
                                <CardContent className="px-2 py-1 space-y-0.5">
                                    <div>
                                        <Label className="text-xs">Stage</Label>
                                        <Input
                                            value={data.stage || ''}
                                            onChange={e => setData('stage', e.target.value)}
                                            className="h-7 text-sm"
                                            placeholder="e.g., Identification, Pre-Bid, Proposal"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Status</Label>
                                        <Input
                                            value={data.status || ''}
                                            onChange={e => setData('status', e.target.value)}
                                            className="h-7 text-sm"
                                            placeholder="e.g., Active, On Hold, Closed"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Submission Date</Label>
                                        <Input
                                            type="date"
                                            value={data.submission_date || ''}
                                            onChange={e => setData('submission_date', e.target.value)}
                                                                                        className="h-7 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Pre-Bid Date</Label>
                                        <Input
                                            type="date"
                                            value={data.pre_bid_expected_date || ''}
                                            onChange={e => setData('pre_bid_expected_date', e.target.value)}
                                                                                        className="h-7 text-sm"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                    </TabsContent>

                    <TabsContent value="requirements" className="mt-2">
                        <Card>
                            <CardHeader className="px-2 py-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Project Requirements</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" size="sm" variant="outline" className="h-6 px-2">
                                            <Filter className="h-3 w-3 mr-1" />
                                            Filter
                                        </Button>
                                        {project?.id && (
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant="ghost" 
                                                className="h-6 px-2 bg-gray-100 hover:bg-gray-200 border-0"
                                                onClick={() => setShowDocumentSelectionModal(true)}
                                                disabled={generatingRequirements}
                                            >
                                                {generatingRequirements ? (
                                                    <>
                                                        <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
                                                        Generating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="h-3 w-3 mr-1" />
                                                        Generate Requirements
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            variant="destructive" 
                                            className="h-6 px-2"
                                            onClick={() => handleClearAllRequirements()}
                                            disabled={requirements.length === 0}
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Clear All
                                        </Button>
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            variant="default" 
                                            className="h-6 px-2"
                                            onClick={() => setShowAddRequirement(true)}
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-2 py-1">
                                <div className="space-y-1">
                                    {(() => {
                                        // Get unique types from requirements
                                        const uniqueTypes = [...new Set(requirements.map((req: any) => req.type).filter(Boolean))];
                                        
                                        return uniqueTypes.map((type, typeIndex) => {
                                            const typeRequirements = requirements.filter((req: any) => req.type === type);
                                            
                                            if (typeRequirements.length === 0) return null;
                                            
                                            return (
                                                <div key={type}>
                                                    <div 
                                                        className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2"
                                                        onClick={() => toggleTypeCollapse(type)}
                                                    >
                                                        {collapsedTypes.has(type) ? (
                                                            <ChevronRight className="h-3 w-3 transition-transform" />
                                                        ) : (
                                                            <ChevronDown className="h-3 w-3 transition-transform" />
                                                        )}
                                                        <FolderOpen className="h-3 w-3" />
                                                        <span className="text-xs font-medium capitalize">{type}</span>
                                                        <Badge variant="secondary" className="text-xs py-0">{typeRequirements.length}</Badge>
                                                    </div>
                                                {!collapsedTypes.has(type) && (
                                                    <div className="space-y-1 ml-5">
                                                        {typeRequirements.map((req: any) => (
                                                        <div key={req.id} className="border rounded hover:bg-gray-50">
                                                            <div className="flex items-center justify-between p-2">
                                                                <div className="flex items-center gap-2 flex-1">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        className="h-3 w-3"
                                                                        checked={req.status === 'Complete'}
                                                                        onChange={(e) => updateRequirementStatus(req.id, e.target.checked ? 'Complete' : 'Pending')}
                                                                    />
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-medium">{req.title}</span>
                                                                            <Badge 
                                                                                variant="outline" 
                                                                                className={cn(
                                                                                    "text-xs py-0",
                                                                                    req.priority === 'Critical' && "border-red-500 text-red-600",
                                                                                    req.priority === 'High' && "border-orange-500 text-orange-600",
                                                                                    req.priority === 'Medium' && "border-yellow-500 text-yellow-600",
                                                                                    req.priority === 'Low' && "border-gray-500 text-gray-600"
                                                                                )}
                                                                            >
                                                                                {req.priority}
                                                                            </Badge>
                                                                        </div>
                                                                        {req.description && (
                                                                            <p className="text-xs text-gray-600 mt-1">{req.description}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Select
                                                                        value={req.status}
                                                                        onValueChange={(value) => updateRequirementStatus(req.id, value)}
                                                                    >
                                                                        <SelectTrigger className="h-5 text-xs w-24 border-0 p-0 focus:ring-0">
                                                                            <Badge 
                                                                                variant="secondary" 
                                                                                className={cn(
                                                                                    "text-xs py-0",
                                                                                    req.status === 'Complete' && "bg-green-100 text-green-700",
                                                                                    req.status === 'In Progress' && "bg-blue-100 text-blue-700",
                                                                                    req.status === 'Pending' && "bg-gray-100 text-gray-700"
                                                                                )}
                                                                            >
                                                                                {req.status}
                                                                            </Badge>
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="Pending">Pending</SelectItem>
                                                                            <SelectItem value="In Progress">In Progress</SelectItem>
                                                                            <SelectItem value="Complete">Complete</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                    <Button 
                                                                        type="button" 
                                                                        size="sm" 
                                                                        variant="ghost" 
                                                                        className="h-5 w-5 p-0"
                                                                        onClick={() => deleteRequirement(req.id)}
                                                                    >
                                                                        <X className="h-3 w-3 text-red-500" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    </div>
                                                )}
                                                {typeIndex < uniqueTypes.length - 1 && <Separator className="mt-3" />}
                                            </div>
                                            );
                                        });
                                    })()}
                                    {requirements.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                            <p className="text-sm">No requirements added yet</p>
                                            <p className="text-xs mt-1">Click the Add button to create your first requirement</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="tasks" className="mt-2">
                        <Card>
                            <CardHeader className="px-2 py-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Tasks</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center border rounded p-0.5">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={taskView === 'kanban' ? 'default' : 'ghost'}
                                                className="h-5 px-2"
                                                onClick={() => setTaskView('kanban')}
                                            >
                                                <Kanban className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={taskView === 'list' ? 'default' : 'ghost'}
                                                className="h-5 px-2"
                                                onClick={() => setTaskView('list')}
                                            >
                                                <List className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-2 py-1">
                                {taskView === 'kanban' ? (
                                    project?.id ? (
                                        <TaskKanban 
                                            projectId={project.id} 
                                            users={users || []}
                                            firms={firms || []}
                                        />
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <p className="text-sm">Save the project first to add tasks</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left px-2 py-1 font-medium">Task</th>
                                                    <th className="text-left px-2 py-1 font-medium">Assigned To</th>
                                                    <th className="text-left px-2 py-1 font-medium">Due Date</th>
                                                    <th className="text-left px-2 py-1 font-medium">Status</th>
                                                    <th className="text-left px-2 py-1 font-medium">Linked Req</th>
                                                    <th className="w-8"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(project?.tasks || []).map((task: any) => (
                                                    <tr key={task.id} className="border-t hover:bg-gray-50">
                                                        <td className="px-2 py-1">{task.title}</td>
                                                        <td className="px-2 py-1">{task.assigned_user?.name || '-'}</td>
                                                        <td className="px-2 py-1">{task.due_date ? format(new Date(task.due_date), 'MMM d') : '-'}</td>
                                                        <td className="px-2 py-1">
                                                            <Badge variant="secondary" className="text-xs py-0">{task.status}</Badge>
                                                        </td>
                                                        <td className="px-2 py-1">{task.requirement ? `REQ-${task.requirement.id}` : '-'}</td>
                                                        <td className="px-1">
                                                            <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0">
                                                                <MoreVertical className="h-3 w-3" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="documents" className="mt-2">
                        <Card>
                            <CardHeader className="px-2 py-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Documents</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                            <Input 
                                                placeholder="Search..." 
                                                className="h-6 pl-7 pr-2 text-xs w-32" 
                                                value={documentSearch}
                                                onChange={(e) => setDocumentSearch(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && fetchDocuments()}
                                            />
                                        </div>
                                        {project?.id && (
                                            <>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".pdf,.doc,.docx"
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                />
                                                <Button 
                                                    type="button" 
                                                    size="sm" 
                                                    variant="default" 
                                                    className="h-6 px-2"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploadingDocument}
                                                >
                                                    {uploadingDocument ? (
                                                        <>
                                                            <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                            Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-3 w-3 mr-1" />
                                                            Upload
                                                        </>
                                                    )}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-2 py-1">
                                {!project?.id ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">Save the project first to add documents</p>
                                    </div>
                                ) : loadingDocuments ? (
                                    <div className="text-center py-8">
                                        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                                        <p className="text-sm mt-2 text-gray-500">Loading documents...</p>
                                    </div>
                                ) : (
                                    <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="text-left px-2 py-1 font-medium">Name</th>
                                                    <th className="text-left px-2 py-1 font-medium">Requirement</th>
                                                    <th className="text-left px-2 py-1 font-medium">Uploaded By</th>
                                                    <th className="text-left px-2 py-1 font-medium">Date</th>
                                                    <th className="w-20"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {documents.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-4 text-gray-500">
                                                            No documents uploaded yet
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    documents.filter(doc => doc && doc.id && doc.name).map((doc) => (
                                                        <tr 
                                                            key={doc.id} 
                                                            className="border-t hover:bg-gray-50 cursor-pointer"
                                                            onClick={(e) => {
                                                                // Don't open if clicking on action buttons
                                                                if (!(e.target as HTMLElement).closest('button') && doc?.id && doc?.name) {
                                                                    handleDocumentDownload(doc.id, doc.name);
                                                                }
                                                            }}
                                                        >
                                                            <td className="px-2 py-1">
                                                                <div className="flex items-center gap-1">
                                                                    {getFileIcon(doc?.name)}
                                                                    <span className="truncate max-w-[200px]" title={doc?.name || 'Unknown file'}>
                                                                        {doc?.name || 'Unknown file'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                                                                {editingDocumentId === doc.id ? (
                                                                    <Select
                                                                        value={doc.requirement?.id?.toString() || "none"}
                                                                        onValueChange={(value) => {
                                                                            handleDocumentRequirementUpdate(doc.id, value === "none" ? null : value);
                                                                        }}
                                                                    >
                                                                        <SelectTrigger className="h-6 text-xs">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">None</SelectItem>
                                                                            {requirements.map((req: any) => (
                                                                                <SelectItem key={req.id} value={req.id.toString()}>
                                                                                    {req.title}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    <div 
                                                                        className="cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1"
                                                                        onClick={() => setEditingDocumentId(doc.id)}
                                                                    >
                                                                        {doc.requirement ? (
                                                                            <Badge variant="outline" className="text-xs py-0">
                                                                                {doc.requirement.title}
                                                                            </Badge>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs hover:text-gray-600">Click to assign</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-1">{doc.uploaded_by?.name || 'Unknown'}</td>
                                                            <td className="px-2 py-1">
                                                                {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : '-'}
                                                            </td>
                                                            <td className="px-1">
                                                                <div className="flex items-center gap-1">
                                                                    <Button 
                                                                        type="button" 
                                                                        size="sm" 
                                                                        variant="ghost" 
                                                                        className="h-5 w-5 p-0"
                                                                        onClick={() => doc?.id && doc?.name && handleDocumentDownload(doc.id, doc.name)}
                                                                        title="Download"
                                                                    >
                                                                        <Download className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button 
                                                                        type="button" 
                                                                        size="sm" 
                                                                        variant="ghost" 
                                                                        className="h-5 w-5 p-0"
                                                                        onClick={() => handleDocumentDelete(doc.id)}
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="h-3 w-3 text-red-500" />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="firms" className="mt-2">
                        <Card>
                            <CardHeader className="px-2 py-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Firms & Partners</CardTitle>
                                    <Button 
                                        type="button" 
                                        size="sm" 
                                        variant="default" 
                                        className="h-6 px-2"
                                        onClick={() => setShowFirmSelectionModal(true)}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Firm
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="px-2 py-1">
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left px-2 py-1 font-medium w-8"></th>
                                                <th className="text-left px-2 py-1 font-medium">Firm Name</th>
                                                <th className="text-left px-2 py-1 font-medium">Role in Project</th>
                                                <th className="text-left px-2 py-1 font-medium">Selected Documents</th>
                                                <th className="text-left px-2 py-1 font-medium">Status</th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.isArray(data.firms) && data.firms.length > 0 ? data.firms.map((firm, index) => {
                                                console.log(`Rendering firm ${firm.name}:`, {
                                                    selectedDocuments: firm.selectedDocuments,
                                                    selectedLength: firm.selectedDocuments?.length,
                                                    documents: firm.documents,
                                                    docsLength: firm.documents?.length
                                                });
                                                return (
                                                <React.Fragment key={firm.id || index}>
                                                    <tr className="border-t hover:bg-gray-50">
                                                        <td className="px-2 py-1">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-5 w-5 p-0"
                                                                onClick={() => toggleFirmExpanded(firm.id)}
                                                            >
                                                                {expandedFirms.has(firm.id) ? (
                                                                    <ChevronDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ChevronRight className="h-3 w-3" />
                                                                )}
                                                            </Button>
                                                        </td>
                                                        <td className="px-2 py-1 font-medium">{firm.name}</td>
                                                        <td className="px-2 py-1">
                                                            <Select 
                                                                value={firm.pivot?.role_in_project || 'Subconsultant'}
                                                                onValueChange={(value) => updateFirmRole(firm.id, value)}
                                                            >
                                                                <SelectTrigger className="h-5 text-xs w-24 border-0 p-0 focus:ring-0">
                                                                    <Badge variant="outline" className="text-xs py-0">
                                                                        {firm.pivot?.role_in_project || 'Subconsultant'}
                                                                    </Badge>
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Lead JV">Lead JV</SelectItem>
                                                                    <SelectItem value="Subconsultant">Subconsultant</SelectItem>
                                                                    <SelectItem value="Internal">Internal</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        <td className="px-2 py-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-blue-600">
                                                                    {firm.selectedDocuments?.length || 0}
                                                                </span>
                                                                <span className="text-gray-400">/</span>
                                                                <span className="text-gray-600">
                                                                    {firm.documents?.length || 0}
                                                                </span>
                                                                <span className="text-xs text-gray-500 ml-1">documents</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-1">
                                                            <Badge variant="secondary" className="text-xs py-0">{firm.status || 'Active'}</Badge>
                                                        </td>
                                                        <td className="px-1">
                                                            <Button 
                                                                type="button" 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                className="h-5 w-5 p-0"
                                                                onClick={() => removeFirm(firm.id)}
                                                                title="Remove firm"
                                                            >
                                                                <X className="h-3 w-3 text-red-500" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                    {expandedFirms.has(firm.id) && (
                                                        <tr>
                                                            <td colSpan={6} className="px-2 py-2 bg-gray-50">
                                                                <div className="ml-4">
                                                                    <div className="text-xs font-medium text-gray-700 mb-2">
                                                                        Available Documents from {firm.name}:
                                                                    </div>
                                                                    {firm.documents && firm.documents.length > 0 ? (
                                                                        <div className="space-y-1">
                                                                            {firm.documents.map((doc: any) => (
                                                                                <div 
                                                                                    key={doc.id} 
                                                                                    className="flex items-center gap-2 p-1 rounded hover:bg-white"
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="h-3 w-3"
                                                                                        checked={firm.selectedDocuments?.some((d: any) => d.id === doc.id) || false}
                                                                                        onChange={(e) => toggleFirmDocument(firm.id, doc, e.target.checked)}
                                                                                    />
                                                                                    <FileText className="h-3 w-3 text-gray-400" />
                                                                                    <span className="text-xs">{doc?.name || 'Unknown file'}</span>
                                                                                    {doc.category && (
                                                                                        <Badge variant="outline" className="text-xs py-0 px-1">
                                                                                            {doc.category}
                                                                                        </Badge>
                                                                                    )}
                                                                                    {doc.created_at && (
                                                                                        <span className="text-xs text-gray-500 ml-auto">
                                                                                            {format(new Date(doc.created_at), 'MMM d, yyyy')}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-xs text-gray-500 italic">
                                                                            No documents uploaded for this firm
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )}) : (
                                                <tr className="border-t">
                                                    <td colSpan={6} className="text-center py-4 text-gray-500 text-sm">
                                                        No firms added yet. Click "Add Firm" to add firms to this project.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="milestones" className="mt-2">
                        {project?.id ? (
                            <Timeline 
                                projectId={project.id} 
                                requirements={requirements}
                            />
                        ) : (
                            <Card>
                                <CardHeader className="px-2 py-1">
                                    <CardTitle className="text-sm">Project Timeline</CardTitle>
                                </CardHeader>
                                <CardContent className="px-2 py-1">
                                    <div className="text-center py-8 text-gray-500">
                                        <CalendarDays className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm">Save the project first to manage timeline</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </form>
            
            <Dialog open={showAddRequirement} onOpenChange={setShowAddRequirement}>
                <DialogContent className="sm:max-w-[425px]" aria-describedby="add-requirement-description">
                    <DialogHeader>
                        <DialogTitle>Add New Requirement</DialogTitle>
                        <p id="add-requirement-description" className="text-sm text-gray-500 mt-1 sr-only">
                            Add a new requirement to the project with type, priority, and description.
                        </p>
                    </DialogHeader>
                    <div className="grid gap-1 py-1">
                        <div className="grid gap-1">
                            <Label htmlFor="req-type">Type</Label>
                            <Input
                                id="req-type"
                                value={newRequirement.type}
                                onChange={(e) => setNewRequirement({...newRequirement, type: e.target.value})}
                                placeholder="e.g., Document, Technical, Legal, Safety, etc."
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor="req-title">Title</Label>
                            <Input
                                id="req-title"
                                value={newRequirement.title}
                                onChange={(e) => setNewRequirement({...newRequirement, title: e.target.value})}
                                placeholder="e.g., Company Registration Certificate"
                            />
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor="req-priority">Priority</Label>
                            <Select
                                value={newRequirement.priority}
                                onValueChange={(value) => setNewRequirement({...newRequirement, priority: value})}
                            >
                                <SelectTrigger id="req-priority">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Critical">Critical</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1">
                            <Label htmlFor="req-description">Description (Optional)</Label>
                            <Textarea
                                id="req-description"
                                value={newRequirement.description}
                                onChange={(e) => setNewRequirement({...newRequirement, description: e.target.value})}
                                placeholder="Additional details about this requirement..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowAddRequirement(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleAddRequirement}>
                            Add Requirement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="sm:max-w-[425px]" aria-describedby="upload-document-description">
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <p id="upload-document-description" className="text-sm text-gray-500 mt-1 sr-only">
                            Upload a document and optionally assign it to a requirement.
                        </p>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div>
                            <Label className="text-sm">File Selected</Label>
                            <div className="flex items-center gap-2 mt-1">
                                {uploadFile && getFileIcon(uploadFile.name)}
                                <span className="text-sm truncate">{uploadFile?.name}</span>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="requirement-select" className="text-sm">Assign to Requirement (Optional)</Label>
                            <Select
                                value={uploadRequirementId || "none"}
                                onValueChange={(value) => setUploadRequirementId(value === "none" ? "" : value)}
                            >
                                <SelectTrigger id="requirement-select" className="mt-1">
                                    <SelectValue placeholder="Select a requirement..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {requirements.map((req: any) => (
                                        <SelectItem key={req.id} value={req.id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <span>{req.title}</span>
                                                <Badge 
                                                    variant="outline" 
                                                    className={cn(
                                                        "text-xs py-0 ml-auto",
                                                        req.priority === 'Critical' && "border-red-500 text-red-600",
                                                        req.priority === 'High' && "border-orange-500 text-orange-600",
                                                        req.priority === 'Medium' && "border-yellow-500 text-yellow-600",
                                                        req.priority === 'Low' && "border-gray-500 text-gray-600"
                                                    )}
                                                >
                                                    {req.priority}
                                                </Badge>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                                setShowUploadDialog(false);
                                setUploadFile(null);
                                setUploadRequirementId('');
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                }
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="button" 
                            onClick={handleDocumentUpload}
                            disabled={uploadingDocument}
                        >
                            {uploadingDocument ? (
                                <>
                                    <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Uploading...
                                </>
                            ) : (
                                'Upload'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <DocumentSelectionModal
                open={showDocumentSelectionModal}
                onOpenChange={setShowDocumentSelectionModal}
                projectId={project?.id || 0}
                onGenerate={handleGenerateRequirements}
                loading={generatingRequirements}
            />
            
            <FirmSelectionModal
                open={showFirmSelectionModal}
                onOpenChange={setShowFirmSelectionModal}
                onSelectFirm={handleFirmSelection}
                existingFirmIds={data.firms.map((f: any) => f.id)}
            />
        </AppLayout>
    );
}