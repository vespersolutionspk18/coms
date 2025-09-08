import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import axios from 'axios';
import {
    Plus, X, Calendar, User, MoreHorizontal,
    AlertCircle, Clock, CheckCircle2, Loader2,
    ChevronDown, FileText, Building2, Flag
} from 'lucide-react';

interface Task {
    id: number;
    project_id: number;
    title: string;
    description?: string;
    assigned_user_id?: number;
    assigned_firm_id?: number;
    due_date?: string;
    status: 'Todo' | 'In Progress' | 'Done';
    priority: 'Low' | 'Medium' | 'High' | 'Critical';
    parent_task_id?: number;
    created_at: string;
    updated_at: string;
    assigned_user?: {
        id: number;
        name: string;
        email: string;
    };
    assigned_firm?: {
        id: number;
        name: string;
    };
}

interface Props {
    projectId: number;
    users?: any[];
    firms?: any[];
}

export default function TaskKanban({ projectId, users = [], firms = [] }: Props) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddTask, setShowAddTask] = useState(false);
    const [showEditTask, setShowEditTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [columnToAdd, setColumnToAdd] = useState<'Todo' | 'In Progress' | 'Done'>('Todo');
    const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
        assigned_user_id: '',
        assigned_firm_id: '',
        due_date: '',
        status: 'Todo' as 'Todo' | 'In Progress' | 'Done',
    });

    const columns = {
        'Todo': { 
            title: 'To Do', 
            color: 'bg-gray-50', 
            headerBg: 'bg-gray-100',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-700',
            icon: <Clock className="h-4 w-4" />
        },
        'In Progress': { 
            title: 'In Progress', 
            color: 'bg-blue-50', 
            headerBg: 'bg-blue-100',
            borderColor: 'border-blue-200',
            textColor: 'text-blue-700',
            icon: <Loader2 className="h-4 w-4" />
        },
        'Done': { 
            title: 'Done', 
            color: 'bg-green-50', 
            headerBg: 'bg-green-100',
            borderColor: 'border-green-200',
            textColor: 'text-green-700',
            icon: <CheckCircle2 className="h-4 w-4" />
        },
    };

    const priorityConfig = {
        'Low': { 
            color: 'bg-gray-100 text-gray-600 border-gray-200', 
            icon: null 
        },
        'Medium': { 
            color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
            icon: null 
        },
        'High': { 
            color: 'bg-orange-100 text-orange-700 border-orange-200', 
            icon: <Flag className="h-3 w-3" /> 
        },
        'Critical': { 
            color: 'bg-red-100 text-red-700 border-red-200', 
            icon: <AlertCircle className="h-3 w-3" /> 
        },
    };

    useEffect(() => {
        fetchTasks();
    }, [projectId]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/tasks?project_id=${projectId}`);
            setTasks(response.data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const sourceStatus = result.source.droppableId;
        const destinationStatus = result.destination.droppableId;
        const taskId = parseInt(result.draggableId);

        if (sourceStatus === destinationStatus && 
            result.source.index === result.destination.index) {
            return;
        }

        // Find the task being moved
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Optimistic update
        const updatedTasks = tasks.map(t => 
            t.id === taskId 
                ? { ...t, status: destinationStatus as Task['status'] }
                : t
        );
        setTasks(updatedTasks);

        try {
            await axios.patch(`/tasks/${taskId}/status`, {
                status: destinationStatus
            });
        } catch (error) {
            console.error('Error updating task status:', error);
            // Revert on error
            fetchTasks();
        }
    };

    const handleAddTask = async () => {
        try {
            const response = await axios.post('/tasks', {
                ...formData,
                project_id: projectId,
                status: columnToAdd,
                assigned_user_id: formData.assigned_user_id || null,
                assigned_firm_id: formData.assigned_firm_id || null,
                due_date: formData.due_date || null,
            });
            
            setTasks([...tasks, response.data]);
            setShowAddTask(false);
            setShowQuickAddDialog(false);
            resetForm();
        } catch (error) {
            console.error('Error adding task:', error);
        }
    };

    const handleEditTask = async () => {
        if (!selectedTask) return;

        try {
            const response = await axios.put(`/tasks/${selectedTask.id}`, {
                ...formData,
                assigned_user_id: formData.assigned_user_id || null,
                assigned_firm_id: formData.assigned_firm_id || null,
                due_date: formData.due_date || null,
            });
            
            setTasks(tasks.map(t => t.id === selectedTask.id ? response.data : t));
            setShowEditTask(false);
            setSelectedTask(null);
            resetForm();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleDeleteTask = async (taskId: number) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            await axios.delete(`/tasks/${taskId}`);
            setTasks(tasks.filter(t => t.id !== taskId));
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            priority: 'Medium',
            assigned_user_id: '',
            assigned_firm_id: '',
            due_date: '',
            status: 'Todo',
        });
    };

    const openEditDialog = (task: Task) => {
        setSelectedTask(task);
        setFormData({
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            assigned_user_id: task.assigned_user_id?.toString() || '',
            assigned_firm_id: task.assigned_firm_id?.toString() || '',
            due_date: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
            status: task.status,
        });
        setShowEditTask(true);
    };

    const openAddDialog = (status: 'Todo' | 'In Progress' | 'Done') => {
        setColumnToAdd(status);
        resetForm();
        setShowAddTask(true);
    };

    const openQuickAddDialog = (status: 'Todo' | 'In Progress' | 'Done') => {
        setColumnToAdd(status);
        resetForm();
        setShowQuickAddDialog(true);
    };

    const getTasksByStatus = (status: 'Todo' | 'In Progress' | 'Done') => {
        return tasks.filter(task => task.status === status);
    };

    const getDueDateInfo = (dueDate: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { color: 'text-red-600 bg-red-50', label: 'Overdue' };
        if (diffDays === 0) return { color: 'text-orange-600 bg-orange-50', label: 'Today' };
        if (diffDays === 1) return { color: 'text-yellow-600 bg-yellow-50', label: 'Tomorrow' };
        if (diffDays <= 7) return { color: 'text-blue-600 bg-blue-50', label: `${diffDays} days` };
        return { color: 'text-gray-600', label: format(due, 'MMM d') };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                    <p className="text-sm text-gray-500 mt-2">Loading tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-3 gap-4">
                    {(Object.keys(columns) as Array<keyof typeof columns>).map(status => (
                        <div 
                            key={status} 
                            className={cn(
                                "rounded-lg border-2 bg-white shadow-sm",
                                columns[status].borderColor
                            )}
                        >
                            {/* Column Header */}
                            <div className={cn(
                                "px-3 py-2 rounded-t-md border-b",
                                columns[status].headerBg,
                                columns[status].borderColor
                            )}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={columns[status].textColor}>
                                            {columns[status].icon}
                                        </div>
                                        <h3 className={cn("font-semibold text-sm", columns[status].textColor)}>
                                            {columns[status].title}
                                        </h3>
                                        <Badge 
                                            variant="secondary" 
                                            className={cn(
                                                "text-xs px-1.5 py-0 font-medium",
                                                columns[status].textColor,
                                                columns[status].color
                                            )}
                                        >
                                            {getTasksByStatus(status).length}
                                        </Badge>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0 hover:bg-white/50"
                                        onClick={() => openAddDialog(status)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Tasks Container */}
                            <div className={cn("p-2", columns[status].color)}>
                                <Droppable droppableId={status}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={cn(
                                                "min-h-[500px] rounded space-y-2",
                                                snapshot.isDraggingOver && "bg-white/60 ring-2 ring-blue-400/40"
                                            )}
                                        >
                                            {/* Quick Add Card Button */}
                                            <button
                                                type="button"
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/70 group border-2 border-dashed border-gray-300 hover:border-gray-400"
                                                onClick={() => openQuickAddDialog(status)}
                                            >
                                                <span className="text-sm text-gray-500 group-hover:text-gray-700 flex items-center gap-1">
                                                    <Plus className="h-4 w-4" />
                                                    Add a task
                                                </span>
                                            </button>

                                            {/* Task Cards */}
                                            {getTasksByStatus(status).map((task, index) => (
                                                <Draggable
                                                    key={task.id}
                                                    draggableId={task.id.toString()}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            style={provided.draggableProps.style}
                                                            className="bg-white rounded-lg border shadow-sm cursor-pointer"
                                                            onClick={() => openEditDialog(task)}
                                                        >
                                                            <div className="p-3">
                                                                {/* Task Header */}
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <h4 className="text-sm font-medium text-gray-900 flex-1 pr-2 leading-tight">
                                                                        {task.title}
                                                                    </h4>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                        }}
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                                                    </Button>
                                                                </div>
                                                                
                                                                {/* Task Description */}
                                                                {task.description && (
                                                                    <p className="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">
                                                                        {task.description}
                                                                    </p>
                                                                )}
                                                                
                                                                {/* Task Metadata */}
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    {/* Priority Badge */}
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={cn(
                                                                            "text-xs px-1.5 py-0 border flex items-center gap-1",
                                                                            priorityConfig[task.priority].color
                                                                        )}
                                                                    >
                                                                        {priorityConfig[task.priority].icon}
                                                                        <span>{task.priority}</span>
                                                                    </Badge>
                                                                    
                                                                    {/* Due Date */}
                                                                    {task.due_date && (
                                                                        <div className={cn(
                                                                            "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
                                                                            getDueDateInfo(task.due_date).color
                                                                        )}>
                                                                            <Calendar className="h-3 w-3" />
                                                                            <span>{getDueDateInfo(task.due_date).label}</span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Assignee */}
                                                                    {task.assigned_user && (
                                                                        <div className="flex items-center gap-1">
                                                                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                                                                <span className="text-xs font-medium text-blue-700">
                                                                                    {task.assigned_user.name.charAt(0).toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                            <span className="text-xs text-gray-600">
                                                                                {task.assigned_user.name.split(' ')[0]}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* Firm */}
                                                                    {task.assigned_firm && (
                                                                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                                                                            <Building2 className="h-3 w-3 mr-0.5" />
                                                                            {task.assigned_firm.name.substring(0, 10)}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        </div>
                    ))}
                </div>
            </DragDropContext>

            {/* Quick Add Task Dialog */}
            <Dialog open={showQuickAddDialog} onOpenChange={setShowQuickAddDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add New Task to {columns[columnToAdd].title}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="quick-task-title">Title *</Label>
                            <Input
                                id="quick-task-title"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                placeholder="Enter task title"
                                className="text-sm"
                                autoFocus
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="quick-task-description">Description</Label>
                            <Textarea
                                id="quick-task-description"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Add a more detailed description..."
                                rows={2}
                                className="text-sm resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="quick-task-priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value: any) => setFormData({...formData, priority: value})}
                                >
                                    <SelectTrigger id="quick-task-priority" className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="quick-task-due-date">Due Date</Label>
                                <Input
                                    id="quick-task-due-date"
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                                    className="text-sm"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="quick-task-assigned">Assign To</Label>
                            <Select
                                value={formData.assigned_user_id || 'unassigned'}
                                onValueChange={(value) => setFormData({...formData, assigned_user_id: value === 'unassigned' ? '' : value})}
                            >
                                <SelectTrigger id="quick-task-assigned" className="text-sm">
                                    <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {users.map((user: any) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowQuickAddDialog(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleAddTask} disabled={!formData.title.trim()}>
                            Add Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Task Dialog */}
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Add New Task</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="task-title">Title *</Label>
                            <Input
                                id="task-title"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                placeholder="Enter task title"
                                className="text-sm"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="task-description">Description</Label>
                            <Textarea
                                id="task-description"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Add a more detailed description..."
                                rows={3}
                                className="text-sm resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="task-priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value: any) => setFormData({...formData, priority: value})}
                                >
                                    <SelectTrigger id="task-priority" className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="task-due-date">Due Date</Label>
                                <Input
                                    id="task-due-date"
                                    type="date"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                                    className="text-sm"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="task-assigned">Assign To</Label>
                            <Select
                                value={formData.assigned_user_id || 'unassigned'}
                                onValueChange={(value) => setFormData({...formData, assigned_user_id: value === 'unassigned' ? '' : value})}
                            >
                                <SelectTrigger id="task-assigned" className="text-sm">
                                    <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {users.map((user: any) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowAddTask(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleAddTask} disabled={!formData.title.trim()}>
                            Add Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={showEditTask} onOpenChange={setShowEditTask}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-title">Title *</Label>
                            <Input
                                id="edit-task-title"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                placeholder="Enter task title"
                                className="text-sm"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-description">Description</Label>
                            <Textarea
                                id="edit-task-description"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Add a more detailed description..."
                                rows={3}
                                className="text-sm resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-task-priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value: any) => setFormData({...formData, priority: value})}
                                >
                                    <SelectTrigger id="edit-task-priority" className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">Low</SelectItem>
                                        <SelectItem value="Medium">Medium</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Critical">Critical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-task-status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value: any) => setFormData({...formData, status: value})}
                                >
                                    <SelectTrigger id="edit-task-status" className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todo">To Do</SelectItem>
                                        <SelectItem value="In Progress">In Progress</SelectItem>
                                        <SelectItem value="Done">Done</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-due-date">Due Date</Label>
                            <Input
                                id="edit-task-due-date"
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                                className="text-sm"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-assigned">Assign To</Label>
                            <Select
                                value={formData.assigned_user_id || 'unassigned'}
                                onValueChange={(value) => setFormData({...formData, assigned_user_id: value === 'unassigned' ? '' : value})}
                            >
                                <SelectTrigger id="edit-task-assigned" className="text-sm">
                                    <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {users.map((user: any) => (
                                        <SelectItem key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="flex items-center justify-between">
                        <Button 
                            type="button" 
                            variant="destructive" 
                            onClick={() => {
                                if (selectedTask) {
                                    handleDeleteTask(selectedTask.id);
                                    setShowEditTask(false);
                                }
                            }}
                            className="mr-auto"
                        >
                            Delete
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowEditTask(false)}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={handleEditTask} disabled={!formData.title.trim()}>
                                Save Changes
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}