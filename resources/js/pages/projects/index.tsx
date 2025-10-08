import React, { useState, useCallback } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { CompactTableView } from '@/components/table/CompactTableView';
import { useTableColumns, projectColumns } from '@/hooks/useTableColumns';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Project {
    id: number;
    title: string;
    sector: string | null;
    scope_of_work: string[] | null;
    client: string | null;
    stage: 'Identification' | 'Pre-Bid' | 'Proposal' | 'Award' | 'Implementation';
    submission_date: string | null;
    bid_security: string | null;
    status: 'Active' | 'Closed' | 'On Hold';
    pre_bid_expected_date: string | null;
    created_at: string;
    updated_at: string;
    firms?: any[];
    milestones?: any[];
}

interface Props {
    projects: {
        data: Project[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export default function ProjectsIndex({ projects }: Props) {
    const columns = useTableColumns(projectColumns);
    const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleRowSelectionChange = useCallback((selected: Project[]) => {
        setSelectedProjects(selected);
    }, []);

    const handleDeleteClick = () => {
        setShowDeleteDialog(true);
    };

    const handleDeleteConfirm = () => {
        setIsDeleting(true);
        const ids = selectedProjects.map(project => project.id);

        router.post('/projects/bulk-destroy', { ids }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowDeleteDialog(false);
                setSelectedProjects([]);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    const handleDeleteCancel = () => {
        setShowDeleteDialog(false);
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Projects' }
            ]}
            headerActions={
                <div className="flex items-center gap-2">
                    {selectedProjects.length > 0 && (
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-2 gap-1"
                            onClick={handleDeleteClick}
                        >
                            <Trash2 className="h-3 w-3" />
                            Delete ({selectedProjects.length})
                        </Button>
                    )}
                    <Link href="/projects/create">
                        <Button size="sm" className="h-7 text-xs px-2 gap-1">
                            <Plus className="h-3 w-3" />
                            Add Project
                        </Button>
                    </Link>
                </div>
            }
        >
            <Head title="Projects" />

            <CompactTableView
                data={projects.data}
                columns={columns}
                title="Projects"
                modelName="Project"
                searchFields={['title', 'client', 'sector']}
                enableGrouping={true}
                enableExport={true}
                enableImport={false}
                defaultPageSize={50}
                rowClickRoute="projects"
                onRowSelectionChange={handleRowSelectionChange}
            />

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Projects</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''}?
                            This action cannot be undone and will permanently delete the project{selectedProjects.length > 1 ? 's' : ''} and all associated data.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="text-sm font-medium mb-2">Projects to be deleted:</div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                            {selectedProjects.map((project) => (
                                <div key={project.id} className="text-sm text-gray-600 px-3 py-1 bg-gray-50 rounded">
                                    {project.title}
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleDeleteCancel}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}