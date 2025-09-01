import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Link } from '@inertiajs/react';

interface AppSidebarHeaderProps {
    breadcrumbs?: BreadcrumbItemType[];
    addButtonRoute?: string;
    addButtonLabel?: string;
    headerActions?: React.ReactNode;
}

export function AppSidebarHeader({ breadcrumbs = [], addButtonRoute, addButtonLabel = 'Add', headerActions }: AppSidebarHeaderProps) {
    return (
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1 h-5 w-5" />
                <div className="h-4 w-px bg-gray-300" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            {headerActions ? (
                headerActions
            ) : (
                addButtonRoute && (
                    <Link href={addButtonRoute}>
                        <Button size="sm" className="h-7 text-xs px-2 gap-1">
                            <Plus className="h-3 w-3" />
                            {addButtonLabel}
                        </Button>
                    </Link>
                )
            )}
        </header>
    );
}
