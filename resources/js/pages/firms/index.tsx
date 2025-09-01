import React from 'react';
import { Head } from '@inertiajs/react';
import { CompactTableView } from '@/components/table/CompactTableView';
import { useTableColumns, firmColumns } from '@/hooks/useTableColumns';
import AppLayout from '@/layouts/app-layout';

interface Firm {
    id: number;
    name: string;
    type: 'Internal' | 'JV Partner';
    primary_contact_id: number | null;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    status: 'Active' | 'Inactive';
    notes: string | null;
    rating: number | null;
    created_at: string;
    updated_at: string;
    primary_contact?: any;
    users?: any[];
}

interface Props {
    firms: {
        data: Firm[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export default function FirmsIndex({ firms }: Props) {
    const columns = useTableColumns(firmColumns);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: 'Firms' }
            ]}
            addButtonRoute="/firms/create"
            addButtonLabel="Add Firm"
        >
            <Head title="Firms" />
            
            <CompactTableView
                data={firms.data}
                columns={columns}
                title="Firms"
                modelName="Firm"
                searchFields={['name', 'contact_email', 'contact_phone']}
                enableGrouping={true}
                enableExport={true}
                enableImport={true}
                defaultPageSize={50}
            />
        </AppLayout>
    );
}