import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import axios from 'axios';
import {
    Plus, X, Calendar, User,
    AlertCircle, Clock, CheckCircle, Loader2
} from 'lucide-react';

interface Task {
    id: number;
    project_id: number;
    requirement_id?: number;
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
    requirement?: {
        id: number;
        title: string;
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
    requirements?: any[];
}

export default function TaskKanban({ projectId, users = [], firms = [], requirements = [] }: Props) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddTask, setShowAddTask] = useState(false);
    const [showEditTask, setShowEditTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [columnToAdd, setColumnToAdd] = useState<'Todo' | 'In Progress' | 'Done'>('Todo');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
        assigned_user_id: '',
        assigned_firm_id: '',
        requirement_id: '',
        due_date: '',
        status: 'Todo' as 'Todo' | 'In Progress' | 'Done',
    });


    const columns = {
        'Todo': { title: 'To Do', color: 'bg-gray-100', textColor: 'text-gray-700' },
        'In Progress': { title: 'In Progress', color: 'bg-blue-100', textColor: 'text-blue-700' },
        'Done': { title: 'Done', color: 'bg-green-100', textColor: 'text-green-700' },
    };

    const priorityColors = {
        'Low': 'bg-gray-100 text-gray-700',
        'Medium': 'bg-yellow-100 text-yellow-700',
        'High': 'bg-orange-100 text-orange-700',
        'Critical': 'bg-red-100 text-red-700',
    };

    const priorityIcons = {
        'Low': null,
        'Medium': null,
        'High': <AlertCircle className="h-3 w-3" />,
        'Critical': <AlertCircle className="h-3 w-3" />,
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

    const handleDragEnd = async (result: any) => {
        if (!result.destination) return;

        const sourceStatus = result.source.droppableId;
        const destinationStatus = result.destination.droppableId;
        const taskId = parseInt(result.draggableId);

        if (sourceStatus === destinationStatus && 
            result.source.index === result.destination.index) {
            return;
        }

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedTask = { ...task, status: destinationStatus as Task['status'] };
        
        setTasks(prevTasks => 
            prevTasks.map(t => t.id === taskId ? updatedTask : t)
        );

        try {
            await axios.patch(`/tasks/${taskId}/status`, {
                status: destinationStatus
            });
        } catch (error) {
            console.error('Error updating task status:', error);
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
                requirement_id: formData.requirement_id || null,
                due_date: formData.due_date || null,
            });
            
            setTasks([...tasks, response.data]);
            setShowAddTask(false);
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
                requirement_id: formData.requirement_id || null,
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
            requirement_id: '',
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
            requirement_id: task.requirement_id?.toString() || '',
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

    const getTasksByStatus = (status: 'Todo' | 'In Progress' | 'Done') => {
        return tasks.filter(task => task.status === status);
    };

    const getDueDateColor = (dueDate: string) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'text-red-600';
        if (diffDays <= 2) return 'text-orange-600';
        if (diffDays <= 7) return 'text-yellow-600';
        return 'text-gray-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    return (
        <>
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(columns) as Array<keyof typeof columns>).map(status => (
                        <div key={status} className="bg-gray-100 rounded-lg border border-gray-300 p-2">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        {columns[status].title}
                                    </span>
                                    <Badge variant="secondary" className="text-xs py-0">
                                        {getTasksByStatus(status).length}
                                    </Badge>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 w-5 p-0 hover:bg-white"
                                    onClick={() => openAddDialog(status)}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                            
                            <Droppable droppableId={status}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={cn(
                                            "min-h-[400px] rounded-md p-1 transition-all",
                                            snapshot.isDraggingOver ? 'bg-gray-200 ring-2 ring-blue-400 ring-opacity-50' : ''
                                        )}
                                    >
                                        <div className="space-y-2">
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
                                                            className={cn(
                                                                "p-2 border rounded bg-white cursor-move hover:shadow-sm transition-shadow",
                                                                snapshot.isDragging && 'shadow-lg'
                                                            )}
                                                            onClick={() => openEditDialog(task)}
                                                        >
                                                            <div className="flex items-start justify-between mb-1">
                                                                <div className="text-sm font-medium flex-1 pr-2">
                                                                    {task.title}
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-5 w-5 p-0 hover:bg-red-100"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteTask(task.id);
                                                                    }}
                                                                >
                                                                    <X className="h-3 w-3 text-red-500" />
                                                                </Button>
                                                            </div>
                                                            
                                                            {task.description && (
                                                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                                                    {task.description}
                                                                </p>
                                                            )}
                                                            
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Badge 
                                                                    variant="outline" 
                                                                    className={cn("text-xs py-0", priorityColors[task.priority])}
                                                                >
                                                                    {priorityIcons[task.priority]}
                                                                    {task.priority}
                                                                </Badge>
                                                                
                                                                {task.due_date && (
                                                                    <div className={cn("flex items-center gap-1 text-xs", getDueDateColor(task.due_date))}>
                                                                        <Calendar className="h-3 w-3" />
                                                                        <span>{format(new Date(task.due_date), 'MMM d')}</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {task.assigned_user && (
                                                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                                                        <User className="h-3 w-3" />
                                                                        <span>{task.assigned_user.name.split(' ')[0]}</span>
                                                                    </div>
                                                                )}
                                                                
                                                                {task.requirement && (
                                                                    <Badge variant="secondary" className="text-xs py-0">
                                                                        REQ-{task.requirement.id}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                        </div>
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>

            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Task</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="task-title">Title</Label>
                            <Input
                                id="task-title"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                placeholder="Enter task title"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="task-description">Description</Label>
                            <Textarea
                                id="task-description"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Enter task description"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-2">
                                <Label htmlFor="task-priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value: any) => setFormData({...formData, priority: value})}
                                >
                                    <SelectTrigger id="task-priority">
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
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="task-assigned">Assigned To (Optional)</Label>
                            <Select
                                value={formData.assigned_user_id || 'unassigned'}
                                onValueChange={(value) => setFormData({...formData, assigned_user_id: value === 'unassigned' ? '' : value})}
                            >
                                <SelectTrigger id="task-assigned">
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
                        <div className="grid gap-2">
                            <Label htmlFor="task-requirement">Linked Requirement (Optional)</Label>
                            <Select
                                value={formData.requirement_id || 'none'}
                                onValueChange={(value) => setFormData({...formData, requirement_id: value === 'none' ? '' : value})}
                            >
                                <SelectTrigger id="task-requirement">
                                    <SelectValue placeholder="Select requirement" />
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
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowAddTask(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleAddTask}>
                            Add Task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEditTask} onOpenChange={setShowEditTask}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Task</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-title">Title</Label>
                            <Input
                                id="edit-task-title"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                placeholder="Enter task title"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-description">Description</Label>
                            <Textarea
                                id="edit-task-description"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="Enter task description"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-task-priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value: any) => setFormData({...formData, priority: value})}
                                >
                                    <SelectTrigger id="edit-task-priority">
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
                                    <SelectTrigger id="edit-task-status">
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
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-assigned">Assigned To (Optional)</Label>
                            <Select
                                value={formData.assigned_user_id || 'unassigned'}
                                onValueChange={(value) => setFormData({...formData, assigned_user_id: value === 'unassigned' ? '' : value})}
                            >
                                <SelectTrigger id="edit-task-assigned">
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
                        <div className="grid gap-2">
                            <Label htmlFor="edit-task-requirement">Linked Requirement (Optional)</Label>
                            <Select
                                value={formData.requirement_id || 'none'}
                                onValueChange={(value) => setFormData({...formData, requirement_id: value === 'none' ? '' : value})}
                            >
                                <SelectTrigger id="edit-task-requirement">
                                    <SelectValue placeholder="Select requirement" />
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
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowEditTask(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleEditTask}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}