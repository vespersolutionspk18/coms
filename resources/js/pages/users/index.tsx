import React from 'react';
import { Head } from '@inertiajs/react';
import { CompactTableView } from '@/components/table/CompactTableView';
import { useTableColumns, userColumns } from '@/hooks/useTableColumns';
import AppLayout from '@/layouts/app-layout';

interface User {
    id: number;
    name: string;
    email: string;
    role: 'superadmin' | 'user';
    firm_id: number | null;
    status: 'Active' | 'Inactive';
    notification_preferences: any;
    created_at: string;
    updated_at: string;
    firm?: {
        id: number;
        name: string;
    };
}

interface Props {
    users: {
        data: User[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export default function UsersIndex({ users }: Props) {
    const columns = useTableColumns(userColumns);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Users' }
            ]}
            addButtonRoute="/users/create"
            addButtonLabel="Add User"
        >
            <Head title="Users" />
            
            <CompactTableView
                data={users.data}
                columns={columns}
                title="Users"
                modelName="User"
                searchFields={['name', 'email', 'role']}
                enableGrouping={true}
                enableExport={true}
                enableImport={false}
                defaultPageSize={50}
                rowClickRoute="users"
            />
        </AppLayout>
    );
}