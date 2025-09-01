import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

interface AppSidebarLayoutProps {
    breadcrumbs?: BreadcrumbItem[];
    addButtonRoute?: string;
    addButtonLabel?: string;
    headerActions?: React.ReactNode;
}

export default function AppSidebarLayout({ 
    children, 
    breadcrumbs = [],
    addButtonRoute,
    addButtonLabel,
    headerActions 
}: PropsWithChildren<AppSidebarLayoutProps>) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader 
                    breadcrumbs={breadcrumbs}
                    addButtonRoute={addButtonRoute}
                    addButtonLabel={addButtonLabel}
                    headerActions={headerActions}
                />
                {children}
            </AppContent>
        </AppShell>
    );
}
