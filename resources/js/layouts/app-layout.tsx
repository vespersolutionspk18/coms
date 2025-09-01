import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    addButtonRoute?: string;
    addButtonLabel?: string;
    headerActions?: ReactNode;
}

export default ({ children, breadcrumbs, addButtonRoute, addButtonLabel, headerActions, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate 
        breadcrumbs={breadcrumbs}
        addButtonRoute={addButtonRoute}
        addButtonLabel={addButtonLabel}
        headerActions={headerActions}
        {...props}
    >
        {children}
    </AppLayoutTemplate>
);
