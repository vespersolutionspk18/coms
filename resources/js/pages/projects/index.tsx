import React from 'react';
import { Head } from '@inertiajs/react';
import { CompactTableView } from '@/components/table/CompactTableView';
import { useTableColumns, projectColumns } from '@/hooks/useTableColumns';
import AppLayout from '@/layouts/app-layout';

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

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Projects' }
            ]}
            addButtonRoute="/projects/create"
            addButtonLabel="Add Project"
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
            />
        </AppLayout>
    );
}