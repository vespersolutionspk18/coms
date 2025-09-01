import React, { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    Building2, Users, Save, Trash2, Star,
    FileText, Briefcase, Plus, X, Shield, Clock, User
} from 'lucide-react';
import { format } from 'date-fns';

interface Firm {
    id?: number;
    name: string;
    type: 'Internal' | 'JV Partner' | null;
    primary_contact_id: number | null;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    website: string | null;
    tax_id: string | null;
    registration_number: string | null;
    established_date: string | null;
    status: 'Active' | 'Inactive' | null;
    notes: string | null;
    rating: number | null;
    capabilities: string[] | null;
    certifications: string[] | null;
    created_at?: string;
    updated_at?: string;
    primary_contact?: any;
    users?: any[];
    projects?: any[];
    documents?: any[];
}

interface Props {
    firm?: Firm;
    users?: any[];
    projects?: any[];
}

export default function FirmForm({ firm, users = [], projects = [] }: Props) {
    const { auth } = usePage().props as any;
    
    const [newCapability, setNewCapability] = useState('');
    const [newCertification, setNewCertification] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<any[]>(firm?.users || []);
    
    const formatDateForInput = (dateString: string | null | undefined) => {
        if (!dateString) return '';
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const { data, setData, post, put, processing, errors } = useForm<any>({
        name: firm?.name || '',
        type: firm?.type || '',
        primary_contact_id: firm?.primary_contact_id || '',
        contact_email: firm?.contact_email || '',
        contact_phone: firm?.contact_phone || '',
        address: firm?.address || '',
        website: firm?.website || '',
        tax_id: firm?.tax_id || '',
        registration_number: firm?.registration_number || '',
        established_date: formatDateForInput(firm?.established_date),
        status: firm?.status || 'Active',
        notes: firm?.notes || '',
        rating: firm?.rating || 0,
        capabilities: Array.isArray(firm?.capabilities) ? firm.capabilities : [],
        certifications: Array.isArray(firm?.certifications) ? firm.certifications : [],
        users: selectedUsers.map(u => u.id),
    });

    const addCapability = () => {
        if (newCapability.trim()) {
            setData('capabilities', [...(data.capabilities || []), newCapability.trim()]);
            setNewCapability('');
        }
    };

    const removeCapability = (index: number) => {
        const capabilities = [...(data.capabilities || [])];
        capabilities.splice(index, 1);
        setData('capabilities', capabilities);
    };

    const addCertification = () => {
        if (newCertification.trim()) {
            setData('certifications', [...(data.certifications || []), newCertification.trim()]);
            setNewCertification('');
        }
    };

    const removeCertification = (index: number) => {
        const certifications = [...(data.certifications || [])];
        certifications.splice(index, 1);
        setData('certifications', certifications);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const submitData: any = {
            ...data,
            capabilities: JSON.stringify(data.capabilities),
            certifications: JSON.stringify(data.certifications),
        };
        
        if (!firm?.id) {
            router.post('/firms', submitData, {
                preserveScroll: true,
                onSuccess: () => {
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center gap-2';
                    notification.innerHTML = '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Firm created successfully!</span>';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 3000);
                },
                onError: () => {
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
                    notification.textContent = 'Failed to create firm. Please check the form.';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 4000);
                }
            });
        } else {
            router.post(`/firms/${firm.id}`, {
                ...submitData,
                _method: 'PUT'
            }, {
                preserveScroll: true,
                preserveState: false,
                onSuccess: () => {
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center gap-2';
                    notification.innerHTML = '<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Firm saved successfully!</span>';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 3000);
                },
                onError: () => {
                    const notification = document.createElement('div');
                    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
                    notification.textContent = 'Failed to save firm. Please check the form.';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 4000);
                }
            });
        }
    };

    const handleDelete = () => {
        if (firm?.id && confirm('Are you sure you want to delete this firm?')) {
            router.delete(`/firms/${firm.id}`);
        }
    };

    const handleRatingClick = (rating: number) => {
        setData('rating', data.rating === rating ? 0 : rating);
    };

    const statusColors = {
        'Active': 'bg-green-100 text-green-700',
        'Inactive': 'bg-gray-100 text-gray-700',
    };

    const typeColors = {
        'Internal': 'bg-blue-100 text-blue-700',
        'JV Partner': 'bg-purple-100 text-purple-700',
    };

    const pageTitle = !firm?.id ? 'New Firm' : (data.name || 'Firm');
    
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Firms', href: '/firms' },
                { title: pageTitle }
            ]}
            headerActions={
                <div className="flex items-center gap-2">
                    {firm?.id && (
                        <>
                            <Badge className={cn("text-xs", typeColors[data.type] || 'bg-gray-100 text-gray-700')}>
                                {data.type || 'No Type'}
                            </Badge>
                            <Badge className={cn("text-xs", statusColors[data.status] || 'bg-gray-100 text-gray-700')}>
                                {data.status || 'Inactive'}
                            </Badge>
                        </>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                        {firm?.id && (
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
                            form="firm-form"
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
            
            <form id="firm-form" onSubmit={handleSubmit} className="space-y-3 p-2">
                <div className="grid grid-cols-3 gap-4">
                    <Card className="col-span-2">
                        <CardHeader className="px-2 py-1">
                            <CardTitle className="text-sm">General Information</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 py-1 space-y-0.5">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Firm Name *</Label>
                                    <Input
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        className="h-7 text-sm"
                                        required
                                    />
                                    {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
                                </div>
                                <div>
                                    <Label className="text-xs">Type *</Label>
                                    <Select value={data.type} onValueChange={(value) => setData('type', value)}>
                                        <SelectTrigger className="h-7 text-sm">
                                            <SelectValue placeholder="Select type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Internal">Internal</SelectItem>
                                            <SelectItem value="JV Partner">JV Partner</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.type && <p className="text-xs text-red-500 mt-0.5">{errors.type}</p>}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Contact Email</Label>
                                    <Input
                                        type="email"
                                        value={data.contact_email || ''}
                                        onChange={e => setData('contact_email', e.target.value)}
                                        className="h-7 text-sm"
                                        placeholder="contact@firm.com"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Contact Phone</Label>
                                    <Input
                                        type="tel"
                                        value={data.contact_phone || ''}
                                        onChange={e => setData('contact_phone', e.target.value)}
                                        className="h-7 text-sm"
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Website</Label>
                                    <Input
                                        type="url"
                                        value={data.website || ''}
                                        onChange={e => setData('website', e.target.value)}
                                        className="h-7 text-sm"
                                        placeholder="https://example.com"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Primary Contact</Label>
                                    <Select 
                                        value={data.primary_contact_id?.toString() || 'none'} 
                                        onValueChange={(value) => setData('primary_contact_id', value === 'none' ? null : parseInt(value))}
                                    >
                                        <SelectTrigger className="h-7 text-sm">
                                            <SelectValue placeholder="Select contact..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {users.map((user: any) => (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs">Address</Label>
                                <Textarea
                                    value={data.address || ''}
                                    onChange={e => setData('address', e.target.value)}
                                    className="text-sm min-h-[60px]"
                                    placeholder="Enter firm address..."
                                    rows={2}
                                />
                            </div>

                            <div>
                                <Label className="text-xs">Capabilities</Label>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                    {(Array.isArray(data.capabilities) ? data.capabilities : []).map((capability, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs py-0 pr-1 group">
                                            {capability}
                                            <button
                                                type="button"
                                                onClick={() => removeCapability(index)}
                                                className="ml-1 hover:text-red-600"
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-1 mt-0.5">
                                    <Input
                                        value={newCapability}
                                        onChange={e => setNewCapability(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCapability())}
                                        placeholder="Add capability..."
                                        className="h-6 text-xs"
                                    />
                                    <Button 
                                        type="button" 
                                        size="sm" 
                                        onClick={addCapability}
                                        className="h-6 px-2"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs">Certifications</Label>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                    {(Array.isArray(data.certifications) ? data.certifications : []).map((certification, index) => (
                                        <Badge key={index} variant="outline" className="text-xs py-0 pr-1 group">
                                            <Shield className="h-2.5 w-2.5 mr-1" />
                                            {certification}
                                            <button
                                                type="button"
                                                onClick={() => removeCertification(index)}
                                                className="ml-1 hover:text-red-600"
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-1 mt-0.5">
                                    <Input
                                        value={newCertification}
                                        onChange={e => setNewCertification(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                                        placeholder="Add certification..."
                                        className="h-6 text-xs"
                                    />
                                    <Button 
                                        type="button" 
                                        size="sm" 
                                        onClick={addCertification}
                                        className="h-6 px-2"
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs">Notes</Label>
                                <Textarea
                                    value={data.notes || ''}
                                    onChange={e => setData('notes', e.target.value)}
                                    className="text-sm min-h-[80px]"
                                    placeholder="Additional notes about this firm..."
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="px-2 py-1">
                            <CardTitle className="text-sm">Details & Status</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 py-1 space-y-0.5">
                            <div>
                                <Label className="text-xs">Status</Label>
                                <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                                    <SelectTrigger className="h-7 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label className="text-xs">Tax ID</Label>
                                <Input
                                    value={data.tax_id || ''}
                                    onChange={e => setData('tax_id', e.target.value)}
                                    className="h-7 text-sm"
                                    placeholder="XX-XXXXXXX"
                                />
                            </div>

                            <div>
                                <Label className="text-xs">Registration Number</Label>
                                <Input
                                    value={data.registration_number || ''}
                                    onChange={e => setData('registration_number', e.target.value)}
                                    className="h-7 text-sm"
                                    placeholder="REG-XXXXX"
                                />
                            </div>

                            <div>
                                <Label className="text-xs">Established Date</Label>
                                <Input
                                    type="date"
                                    value={data.established_date || ''}
                                    onChange={e => setData('established_date', e.target.value)}
                                    className="h-7 text-sm"
                                />
                            </div>

                            <div>
                                <Label className="text-xs">Rating</Label>
                                <div className="flex gap-1 mt-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => handleRatingClick(star)}
                                            className="hover:scale-110 transition-transform"
                                        >
                                            <Star 
                                                className={cn(
                                                    "h-5 w-5",
                                                    star <= (data.rating || 0) 
                                                        ? "fill-yellow-400 text-yellow-400" 
                                                        : "text-gray-300"
                                                )}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {firm?.id && (
                                <>
                                    <Separator className="my-2" />
                                    <div className="space-y-1 text-xs text-gray-600">
                                        <div className="flex justify-between">
                                            <span>Created:</span>
                                            <span>{firm.created_at ? format(new Date(firm.created_at), 'MMM d, yyyy') : '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Updated:</span>
                                            <span>{firm.updated_at ? format(new Date(firm.updated_at), 'MMM d, yyyy') : '-'}</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="px-2 py-1">
                            <CardTitle className="text-sm">Quick Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 py-1">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="h-3 w-3 text-blue-500" />
                                        <span className="text-xs">Active Projects</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs py-0">
                                        {firm?.projects?.filter((p: any) => p.status === 'Active').length || 0}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-3 w-3 text-green-500" />
                                        <span className="text-xs">Team Members</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs py-0">
                                        {firm?.users?.length || 0}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-3 w-3 text-purple-500" />
                                        <span className="text-xs">Documents</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs py-0">
                                        {firm?.documents?.length || 0}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="px-2 py-1">
                            <CardTitle className="text-sm">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="px-2 py-1">
                            <div className="space-y-1 text-xs text-gray-600">
                                <div className="flex items-start gap-2">
                                    <Clock className="h-3 w-3 mt-0.5 text-blue-500" />
                                    <span>Project "Website Redesign" started</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <User className="h-3 w-3 mt-0.5 text-green-500" />
                                    <span>New team member added</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <FileText className="h-3 w-3 mt-0.5 text-purple-500" />
                                    <span>Contract document uploaded</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </AppLayout>
    );
}