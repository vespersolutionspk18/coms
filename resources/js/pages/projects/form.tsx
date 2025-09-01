import React, { useState, useEffect, useRef } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
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
import {
    FileText, Users, CheckSquare, FolderOpen, Building2, Calendar,
    Plus, Edit2, Save, X, ChevronRight, Clock, AlertCircle,
    DollarSign, Briefcase, Target, TrendingUp, Trash2, Eye,
    Download, Upload, Filter, Search, MoreVertical, Link2,
    Kanban, List, CalendarDays, ChevronDown
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
    stage: 'Identification' | 'Pre-Bid' | 'Proposal' | 'Award' | 'Implementation';
    submission_date: string | null;
    bid_security: string | null;
    status: 'Active' | 'Closed' | 'On Hold';
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
    // Preserve tab state using URL hash or localStorage
    const [activeTab, setActiveTab] = useState(() => {
        // Check URL hash first
        const hash = window.location.hash.replace('#', '');
        if (['overview', 'requirements', 'tasks', 'documents', 'firms', 'milestones'].includes(hash)) {
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

    const { data, setData, post, put, processing, errors } = useForm<any>({
        title: project?.title || '',
        sector: project?.sector || '',
        scope_of_work: Array.isArray(project?.scope_of_work) ? project.scope_of_work : [],
        client: project?.client || '',
        stage: project?.stage || 'Identification',
        submission_date: formatDateForInput(project?.submission_date),
        bid_security: project?.bid_security || '',
        status: project?.status || 'Active',
        pre_bid_expected_date: formatDateForInput(project?.pre_bid_expected_date),
        firms: Array.isArray(project?.firms) ? project.firms : [],
        requirements: Array.isArray(project?.requirements) ? project.requirements : [],
    });

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
            setData('firms', [...data.firms, { ...firm, pivot: { role_in_project: 'Partner' } }]);
        }
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
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload only image files (JPEG, PNG, JPG, GIF, SVG)');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setAdvertisementFile(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setAdvertisementPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeAdvertisement = () => {
        setAdvertisementFile(null);
        setAdvertisementPreview(null);
        if (advertisementInputRef.current) {
            advertisementInputRef.current.value = '';
        }
        // Mark for removal if editing existing project
        if (project?.id) {
            setData('remove_advertisement', true);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const formData = new FormData();
        
        // Add all regular data fields
        Object.keys(data).forEach(key => {
            if (key === 'scope_of_work' || key === 'firms' || key === 'requirements') {
                formData.append(key, JSON.stringify(data[key]));
            } else if (data[key] !== null && data[key] !== undefined) {
                formData.append(key, data[key]);
            }
        });
        
        // Add advertisement file if present
        if (advertisementFile) {
            formData.append('advertisement', advertisementFile);
        }
        
        if (!project?.id) {
            router.post('/projects', formData, {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    // Stay on form or redirect to edit page
                }
            });
        } else {
            formData.append('_method', 'PUT');
            router.post(`/projects/${project.id}`, formData, {
                preserveScroll: true,
                preserveState: false,
                forceFormData: true,
                onSuccess: () => {
                    // Stay on the same page after saving
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

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        setUploadFile(file);
        setShowUploadDialog(true);
    };

    const handleDocumentUpload = async () => {
        if (!uploadFile || !project?.id) return;

        setUploadingDocument(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('project_id', project.id.toString());
        if (uploadRequirementId) {
            formData.append('requirement_id', uploadRequirementId);
        }

        try {
            const response = await axios.post('/documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
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
            alert(error.response?.data?.message || 'Failed to upload document');
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

    const getFileIcon = (fileName: string) => {
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
                            className="h-6 text-xs px-2"
                        >
                            <Save className="h-3 w-3 mr-1" />
                            Save
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
                        <TabsTrigger value="requirements">Requirements</TabsTrigger>
                        <TabsTrigger value="tasks">Tasks</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="firms">Firms</TabsTrigger>
                        <TabsTrigger value="milestones">Timeline</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-3 mt-2">
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="col-span-2">
                                <CardHeader className="px-2 py-1">
                                    <CardTitle className="text-sm">General Information</CardTitle>
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
                                        <Label className="text-xs">Advertisement</Label>
                                        <div className="mt-0.5">
                                            {advertisementPreview ? (
                                                <div className="relative">
                                                    <img 
                                                        src={advertisementPreview} 
                                                        alt="Advertisement" 
                                                        className="w-full h-32 object-cover rounded border"
                                                    />
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
                                                        accept="image/*"
                                                        onChange={handleAdvertisementSelect}
                                                        className="hidden"
                                                    />
                                                    <Upload className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                                                    <p className="text-xs text-gray-600 mb-1">Upload advertisement image</p>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-6 text-xs px-2"
                                                        onClick={() => advertisementInputRef.current?.click()}
                                                    >
                                                        Choose File
                                                    </Button>
                                                    <p className="text-xs text-gray-500 mt-1">Max 5MB (JPEG, PNG, GIF, SVG)</p>
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
                                        <Select
                                            value={data.stage}
                                            onValueChange={(value: any) => setData('stage', value)}
                                                                                    >
                                            <SelectTrigger className="h-7 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Identification">Identification</SelectItem>
                                                <SelectItem value="Pre-Bid">Pre-Bid</SelectItem>
                                                <SelectItem value="Proposal">Proposal</SelectItem>
                                                <SelectItem value="Award">Award</SelectItem>
                                                <SelectItem value="Implementation">Implementation</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Status</Label>
                                        <Select
                                            value={data.status}
                                            onValueChange={(value: any) => setData('status', value)}
                                                                                    >
                                            <SelectTrigger className="h-7 text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Active">Active</SelectItem>
                                                <SelectItem value="On Hold">On Hold</SelectItem>
                                                <SelectItem value="Closed">Closed</SelectItem>
                                            </SelectContent>
                                        </Select>
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

                        <Card>
                            <CardHeader className="px-2 py-1">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Linked Firms</CardTitle>
                                    <div className="flex gap-1">
                                        <Select onValueChange={(value) => addFirm(parseInt(value))}>
                                            <SelectTrigger className="h-6 text-xs w-32">
                                                <SelectValue placeholder="Add firm..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {firms.filter((f: any) => !data.firms.some((df: any) => df.id === f.id)).map((firm: any) => (
                                                    <SelectItem key={firm.id} value={firm.id.toString()}>
                                                        {firm.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-2 py-1">
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left px-2 py-1 font-medium">Firm Name</th>
                                                <th className="text-left px-2 py-1 font-medium">Role</th>
                                                <th className="text-left px-2 py-1 font-medium">Contact</th>
                                                <th className="text-left px-2 py-1 font-medium">Status</th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(Array.isArray(data.firms) ? data.firms : []).map((firm: any, index: number) => (
                                                <tr key={index} className="border-t">
                                                    <td className="px-2 py-1">{firm.name}</td>
                                                    <td className="px-2 py-1">
                                                        <Select 
                                                            value={firm.pivot?.role_in_project || 'Partner'}
                                                            onValueChange={(value) => updateFirmRole(firm.id, value)}
                                                        >
                                                            <SelectTrigger className="h-5 text-xs w-24 border-0 p-0 focus:ring-0">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Lead JV">Lead JV</SelectItem>
                                                                <SelectItem value="Partner">Partner</SelectItem>
                                                                <SelectItem value="Subconsultant">Subconsultant</SelectItem>
                                                                <SelectItem value="Internal">Internal</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="px-2 py-1">{firm.contact_email}</td>
                                                    <td className="px-2 py-1">
                                                        <Badge variant="secondary" className="text-xs py-0">
                                                            {firm.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-1">
                                                        <Button 
                                                            type="button" 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            className="h-5 w-5 p-0"
                                                            onClick={() => removeFirm(firm.id)}
                                                        >
                                                            <X className="h-3 w-3 text-red-500" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="px-2 py-1">
                                    <CardTitle className="text-sm">Milestones</CardTitle>
                                </CardHeader>
                                <CardContent className="px-2 py-1">
                                    <div className="space-y-1">
                                        {project?.milestones?.map((milestone, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        milestone.status === 'completed' ? 'bg-green-500' :
                                                        milestone.status === 'in_progress' ? 'bg-blue-500' :
                                                        'bg-gray-300'
                                                    )} />
                                                    <span className="text-sm">{milestone.title}</span>
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {milestone.due_date ? format(new Date(milestone.due_date), 'MMM d') : 'No date'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="px-2 py-1">
                                    <CardTitle className="text-sm">AI Insights</CardTitle>
                                </CardHeader>
                                <CardContent className="px-2 py-1">
                                    <div className="space-y-1 text-xs text-gray-600">
                                        <div className="flex items-start gap-2">
                                            <TrendingUp className="h-3 w-3 mt-0.5 text-blue-500" />
                                            <span>Project on track with 85% requirements met</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-3 w-3 mt-0.5 text-yellow-500" />
                                            <span>2 critical documents pending review</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Target className="h-3 w-3 mt-0.5 text-green-500" />
                                            <span>Recommended: Schedule pre-bid meeting</span>
                                        </div>
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
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <FolderOpen className="h-3 w-3" />
                                                        <span className="text-xs font-medium capitalize">{type}</span>
                                                        <Badge variant="secondary" className="text-xs py-0">{typeRequirements.length}</Badge>
                                                    </div>
                                                <div className="space-y-1">
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
                                            requirements={requirements}
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
                                                    documents.map((doc) => (
                                                        <tr 
                                                            key={doc.id} 
                                                            className="border-t hover:bg-gray-50 cursor-pointer"
                                                            onClick={(e) => {
                                                                // Don't open if clicking on action buttons
                                                                if (!(e.target as HTMLElement).closest('button')) {
                                                                    handleDocumentDownload(doc.id, doc.name);
                                                                }
                                                            }}
                                                        >
                                                            <td className="px-2 py-1">
                                                                <div className="flex items-center gap-1">
                                                                    {getFileIcon(doc.name)}
                                                                    <span className="truncate max-w-[200px]" title={doc.name}>
                                                                        {doc.name}
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
                                                                        onClick={() => handleDocumentDownload(doc.id, doc.name)}
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
                                    {(
                                        <Button type="button" size="sm" variant="default" className="h-6 px-2">
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Firm
                                        </Button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="px-2 py-1">
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left px-2 py-1 font-medium">Firm Name</th>
                                                <th className="text-left px-2 py-1 font-medium">Role in Project</th>
                                                <th className="text-left px-2 py-1 font-medium">Assigned Requirements</th>
                                                <th className="text-left px-2 py-1 font-medium">Uploaded Documents</th>
                                                <th className="text-left px-2 py-1 font-medium">Status</th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-t bg-blue-50">
                                                <td className="px-2 py-1 font-medium">
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="h-3 w-3 text-blue-600" />
                                                        Our Company
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1">
                                                    <Badge className="text-xs py-0 bg-blue-100 text-blue-700">Lead</Badge>
                                                </td>
                                                <td className="px-2 py-1">
                                                    <div className="flex items-center gap-1">
                                                        <span>15</span>
                                                        <span className="text-gray-400">/</span>
                                                        <span className="text-green-600">12</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1">8</td>
                                                <td className="px-2 py-1">
                                                    <Badge variant="secondary" className="text-xs py-0">Active</Badge>
                                                </td>
                                                <td className="px-1">
                                                    <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0">
                                                        <ChevronRight className="h-3 w-3" />
                                                    </Button>
                                                </td>
                                            </tr>
                                            {project?.firms?.map((firm, index) => (
                                                <tr key={index} className="border-t hover:bg-gray-50">
                                                    <td className="px-2 py-1 font-medium">{firm.name}</td>
                                                    <td className="px-2 py-1">
                                                        <Badge variant="outline" className="text-xs py-0">
                                                            {firm.pivot?.role_in_project || 'Partner'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <div className="flex items-center gap-1">
                                                            <span>5</span>
                                                            <span className="text-gray-400">/</span>
                                                            <span className="text-green-600">3</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-2 py-1">3</td>
                                                    <td className="px-2 py-1">
                                                        <Badge variant="secondary" className="text-xs py-0">{firm.status}</Badge>
                                                    </td>
                                                    <td className="px-1">
                                                        <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0">
                                                            <ChevronRight className="h-3 w-3" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
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
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Requirement</DialogTitle>
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
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
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
        </AppLayout>
    );
}