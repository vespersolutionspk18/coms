import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    Plus, Edit2, Trash2, Calendar, Clock, Target, Users,
    CheckCircle, AlertCircle, ChevronUp, ChevronDown,
    CalendarDays, Milestone as MilestoneIcon, Save, X
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Milestone {
    id?: number;
    project_id?: number;
    title: string;
    description?: string;
    due_date?: string;
    status: 'Pending' | 'Complete' | 'Overdue';
    requirements?: any[];
    created_at?: string;
    updated_at?: string;
}

interface TimelineProps {
    projectId: number;
    requirements?: any[];
}

export default function Timeline({ projectId, requirements = [] }: TimelineProps) {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
    // Only timeline view needed
    const [formData, setFormData] = useState<Milestone>({
        title: '',
        description: '',
        due_date: '',
        status: 'Pending'
    });
    const [selectedRequirements, setSelectedRequirements] = useState<number[]>([]);

    // Debug logging
    useEffect(() => {
        console.log('Timeline component mounted with projectId:', projectId);
        console.log('Requirements passed:', requirements);
    }, []);

    useEffect(() => {
        if (projectId) {
            fetchMilestones();
        }
    }, [projectId]);

    const fetchMilestones = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/milestones', {
                params: { project_id: projectId }
            });
            setMilestones(response.data.milestones || []);
            checkOverdueMilestones(response.data.milestones || []);
        } catch (error) {
            console.error('Error fetching milestones:', error);
        } finally {
            setLoading(false);
        }
    };

    const checkOverdueMilestones = (milestoneList: Milestone[]) => {
        const today = new Date();
        milestoneList.forEach(async (milestone) => {
            if (milestone.due_date && milestone.status === 'Pending') {
                const dueDate = parseISO(milestone.due_date);
                if (dueDate < today) {
                    await updateMilestoneStatus(milestone.id!, 'Overdue');
                }
            }
        });
    };

    const handleAddMilestone = async () => {
        console.log('Adding milestone with data:', formData);
        console.log('Selected requirements:', selectedRequirements);
        
        if (!formData.title.trim()) {
            alert('Please enter a title for the milestone');
            return;
        }
        
        try {
            const response = await axios.post('/milestones', {
                ...formData,
                project_id: projectId,
                requirement_ids: selectedRequirements
            });
            setMilestones([...milestones, response.data.milestone]);
            setShowAddDialog(false);
            resetForm();
        } catch (error: any) {
            console.error('Error adding milestone:', error);
            alert(error.response?.data?.message || 'Failed to add milestone');
        }
    };

    const handleUpdateMilestone = async () => {
        if (!editingMilestone?.id) return;
        
        console.log('Updating milestone:', editingMilestone.id);
        
        if (!formData.title.trim()) {
            alert('Please enter a title for the milestone');
            return;
        }
        
        try {
            const response = await axios.put(`/milestones/${editingMilestone.id}`, {
                ...formData,
                requirement_ids: selectedRequirements
            });
            setMilestones(milestones.map(m => 
                m.id === editingMilestone.id ? response.data.milestone : m
            ));
            setShowEditDialog(false);
            resetForm();
        } catch (error: any) {
            console.error('Error updating milestone:', error);
            alert(error.response?.data?.message || 'Failed to update milestone');
        }
    };

    const handleDeleteMilestone = async (id: number) => {
        if (!confirm('Are you sure you want to delete this milestone?')) return;
        
        try {
            await axios.delete(`/milestones/${id}`);
            setMilestones(milestones.filter(m => m.id !== id));
        } catch (error) {
            console.error('Error deleting milestone:', error);
        }
    };

    const updateMilestoneStatus = async (id: number, status: 'Pending' | 'Complete' | 'Overdue') => {
        try {
            const response = await axios.patch(`/milestones/${id}/status`, { status });
            setMilestones(milestones.map(m => 
                m.id === id ? { ...m, status } : m
            ));
        } catch (error) {
            console.error('Error updating milestone status:', error);
        }
    };

    const handleDragEnd = async (draggedId: number, targetDate: string) => {
        const milestone = milestones.find(m => m.id === draggedId);
        if (!milestone) return;

        try {
            await axios.put(`/milestones/${draggedId}`, {
                ...milestone,
                due_date: targetDate
            });
            setMilestones(milestones.map(m => 
                m.id === draggedId ? { ...m, due_date: targetDate } : m
            ));
        } catch (error) {
            console.error('Error updating milestone date:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            due_date: '',
            status: 'Pending'
        });
        setSelectedRequirements([]);
        setEditingMilestone(null);
    };

    const openEditDialog = (milestone: Milestone) => {
        setEditingMilestone(milestone);
        setFormData({
            title: milestone.title,
            description: milestone.description || '',
            due_date: milestone.due_date || '',
            status: milestone.status
        });
        setSelectedRequirements(milestone.requirements?.map((r: any) => r.id) || []);
        setShowEditDialog(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Complete': return 'bg-green-100 text-green-700';
            case 'Pending': return 'bg-yellow-100 text-yellow-700';
            case 'Overdue': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Complete': return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'Pending': return <Clock className="h-4 w-4 text-yellow-600" />;
            case 'Overdue': return <AlertCircle className="h-4 w-4 text-red-600" />;
            default: return <Target className="h-4 w-4 text-gray-600" />;
        }
    };

    const getDaysUntilDue = (dueDate: string) => {
        const days = differenceInDays(parseISO(dueDate), new Date());
        if (days < 0) return `${Math.abs(days)} days overdue`;
        if (days === 0) return 'Due today';
        if (days === 1) return '1 day left';
        return `${days} days left`;
    };

    const renderTimeline = () => (
        <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            <div className="space-y-4">
                {milestones.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <MilestoneIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No milestones added yet</p>
                        <p className="text-xs mt-1">Click the Add Milestone button to create your first milestone</p>
                    </div>
                ) : (
                    milestones.map((milestone, index) => (
                        <div key={milestone.id} className="flex items-start gap-3 relative group">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center z-10",
                                milestone.status === 'Complete' ? 'bg-green-100' :
                                milestone.status === 'Overdue' ? 'bg-red-100' :
                                'bg-yellow-100'
                            )}>
                                {getStatusIcon(milestone.status)}
                            </div>
                            <div className="flex-1 bg-white border rounded-lg p-3 hover:shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-sm">{milestone.title}</h4>
                                            <Badge className={cn("text-xs py-0", getStatusColor(milestone.status))}>
                                                {milestone.status}
                                            </Badge>
                                        </div>
                                        {milestone.description && (
                                            <p className="text-xs text-gray-600 mb-2">{milestone.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            {milestone.due_date && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{format(parseISO(milestone.due_date), 'MMM d, yyyy')}</span>
                                                    {milestone.status !== 'Complete' && (
                                                        <span className={cn(
                                                            "ml-1",
                                                            differenceInDays(parseISO(milestone.due_date), new Date()) < 3 
                                                                ? "text-orange-600 font-medium" 
                                                                : ""
                                                        )}>
                                                            ({getDaysUntilDue(milestone.due_date)})
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {milestone.requirements && milestone.requirements.length > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    <span>{milestone.requirements.length} linked requirements</span>
                                                </div>
                                            )}
                                        </div>
                                        {milestone.requirements && milestone.requirements.length > 0 && (
                                            <div className="mt-2 pt-2 border-t">
                                                <div className="text-xs font-medium mb-1">Linked Requirements:</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {milestone.requirements.map((req: any) => (
                                                        <Badge key={req.id} variant="outline" className="text-xs py-0">
                                                            {req.title}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {milestone.status !== 'Complete' && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                                onClick={() => updateMilestoneStatus(milestone.id!, 'Complete')}
                                                title="Mark as complete"
                                            >
                                                <CheckCircle className="h-3 w-3 text-green-600" />
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={() => openEditDialog(milestone)}
                                        >
                                            <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                            onClick={() => handleDeleteMilestone(milestone.id!)}
                                        >
                                            <Trash2 className="h-3 w-3 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <>
            <Card>
                <CardHeader className="px-2 py-1">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Project Timeline</CardTitle>
                        <Button
                            type="button"
                            size="sm"
                            variant="default"
                            className="h-6 px-2"
                            onClick={() => {
                                console.log('Add Milestone button clicked');
                                console.log('Current requirements:', requirements);
                                setShowAddDialog(true);
                            }}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Milestone
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="px-2 py-1">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
                            <p className="text-sm mt-2 text-gray-500">Loading timeline...</p>
                        </div>
                    ) : (
                        renderTimeline()
                    )}
                </CardContent>
            </Card>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Milestone</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-3">
                        <div>
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                placeholder="e.g., Submit Technical Proposal"
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Additional details about this milestone..."
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input
                                id="due_date"
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label htmlFor="status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value: any) => setFormData({...formData, status: value})}
                            >
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Complete">Complete</SelectItem>
                                    <SelectItem value="Overdue">Overdue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Link Requirements (Optional) - {requirements.length} available</Label>
                            <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                                {!requirements || requirements.length === 0 ? (
                                    <p className="text-xs text-gray-500">No requirements available. Add requirements in the Requirements tab first.</p>
                                ) : (
                                    <div className="space-y-1">
                                        {requirements.map((req: any) => {
                                            console.log('Rendering requirement:', req);
                                            return (
                                                <label key={req.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRequirements.includes(req.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedRequirements([...selectedRequirements, req.id]);
                                                            } else {
                                                                setSelectedRequirements(selectedRequirements.filter(id => id !== req.id));
                                                            }
                                                        }}
                                                        className="h-3 w-3"
                                                    />
                                                    <span className="text-xs">{req.title}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                            setShowAddDialog(false);
                            resetForm();
                        }}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleAddMilestone}>
                            Add Milestone
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Milestone</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-3">
                        <div>
                            <Label htmlFor="edit-title">Title</Label>
                            <Input
                                id="edit-title"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-description">Description (Optional)</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-due_date">Due Date</Label>
                            <Input
                                id="edit-due_date"
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-status">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value: any) => setFormData({...formData, status: value})}
                            >
                                <SelectTrigger id="edit-status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Complete">Complete</SelectItem>
                                    <SelectItem value="Overdue">Overdue</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Link Requirements (Optional) - {requirements.length} available</Label>
                            <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                                {!requirements || requirements.length === 0 ? (
                                    <p className="text-xs text-gray-500">No requirements available. Add requirements in the Requirements tab first.</p>
                                ) : (
                                    <div className="space-y-1">
                                        {requirements.map((req: any) => {
                                            console.log('Rendering requirement:', req);
                                            return (
                                                <label key={req.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRequirements.includes(req.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedRequirements([...selectedRequirements, req.id]);
                                                            } else {
                                                                setSelectedRequirements(selectedRequirements.filter(id => id !== req.id));
                                                            }
                                                        }}
                                                        className="h-3 w-3"
                                                    />
                                                    <span className="text-xs">{req.title}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => {
                            setShowEditDialog(false);
                            resetForm();
                        }}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleUpdateMilestone}>
                            Update Milestone
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}