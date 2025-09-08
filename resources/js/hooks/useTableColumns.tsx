import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ColumnConfig<T> = {
    accessorKey: keyof T;
    header: string;
    type?: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'status' | 'badge' | 'currency' | 'email' | 'phone';
    format?: (value: any) => string;
    sortable?: boolean;
    filterable?: boolean;
    groupable?: boolean;
    hidden?: boolean;
    width?: number;
    align?: 'left' | 'center' | 'right';
    statusColors?: Record<string, string>;
};

export function useTableColumns<T extends Record<string, any>>(
    configs: ColumnConfig<T>[]
): ColumnDef<T>[] {
    return useMemo(() => {
        return configs
            .filter((config) => !config.hidden)
            .map((config) => {
                const column: ColumnDef<T> = {
                    accessorKey: config.accessorKey as string,
                    header: config.header,
                    enableSorting: config.sortable !== false,
                    enableColumnFilter: config.filterable !== false,
                    enableGrouping: config.groupable ?? true,
                    size: config.width,
                };

                // Custom cell renderer based on type
                column.cell = ({ getValue, row }) => {
                    const value = getValue();
                    
                    if (value === null || value === undefined) {
                        return <span className="text-gray-400">—</span>;
                    }

                    if (config.format) {
                        return config.format(value);
                    }

                    switch (config.type) {
                        case 'date':
                            return value ? format(new Date(value as string), 'MMM d, yyyy') : '—';
                        
                        case 'datetime':
                            return value ? format(new Date(value as string), 'MMM d, yyyy h:mm a') : '—';
                        
                        case 'boolean':
                            return (
                                <Badge variant={value ? 'default' : 'secondary'}>
                                    {value ? 'Yes' : 'No'}
                                </Badge>
                            );
                        
                        case 'status':
                            const status = String(value).toLowerCase();
                            const colors = config.statusColors || {
                                active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                                inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
                                pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                                completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                                failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                            };
                            return (
                                <Badge 
                                    className={cn(
                                        'capitalize',
                                        colors[status] || colors.inactive
                                    )}
                                    variant="outline"
                                >
                                    {value}
                                </Badge>
                            );
                        
                        case 'badge':
                            if (Array.isArray(value)) {
                                return (
                                    <div className="flex flex-wrap gap-1">
                                        {value.map((item, index) => (
                                            <Badge key={index} variant="secondary">
                                                {item}
                                            </Badge>
                                        ))}
                                    </div>
                                );
                            }
                            return <Badge variant="secondary">{value}</Badge>;
                        
                        case 'currency':
                            const amount = parseFloat(String(value));
                            return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                            }).format(amount);
                        
                        case 'number':
                            return new Intl.NumberFormat('en-US').format(Number(value));
                        
                        case 'email':
                            return (
                                <a 
                                    href={`mailto:${value}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    {value}
                                </a>
                            );
                        
                        case 'phone':
                            return (
                                <a 
                                    href={`tel:${value}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    {value}
                                </a>
                            );
                        
                        default:
                            return String(value);
                    }
                };

                // Add alignment
                if (config.align) {
                    const originalCell = column.cell;
                    column.cell = ({ getValue, row, column: col, table, renderValue }) => {
                        const content = originalCell!({ getValue, row, column: col, table, renderValue });
                        return (
                            <div className={cn(
                                config.align === 'center' && 'text-center',
                                config.align === 'right' && 'text-right'
                            )}>
                                {content}
                            </div>
                        );
                    };
                }

                return column;
            });
    }, [configs]);
}

// Preset column configurations for common models
export const projectColumns: ColumnConfig<any>[] = [
    { accessorKey: 'title', header: 'Title', sortable: true, filterable: true },
    { accessorKey: 'client', header: 'Client', sortable: true, filterable: true },
    { accessorKey: 'sector', header: 'Sector', sortable: true, filterable: true, groupable: true },
    { accessorKey: 'stage', header: 'Stage', type: 'status', sortable: true, filterable: true, groupable: true,
        statusColors: {
            identification: 'bg-gray-100 text-gray-800',
            'pre-bid': 'bg-yellow-100 text-yellow-800',
            proposal: 'bg-blue-100 text-blue-800',
            award: 'bg-green-100 text-green-800',
            implementation: 'bg-purple-100 text-purple-800',
        }
    },
    { accessorKey: 'status', header: 'Status', type: 'status', sortable: true, filterable: true, groupable: true },
    { accessorKey: 'submission_date', header: 'Submission Date', type: 'date', sortable: true },
    { accessorKey: 'bid_security', header: 'Bid Security', type: 'currency', sortable: true, align: 'right' },
    { accessorKey: 'created_at', header: 'Created', type: 'date', sortable: true },
];

export const firmColumns: ColumnConfig<any>[] = [
    { accessorKey: 'name', header: 'Name', sortable: true, filterable: true, type: 'link', linkPrefix: '/firms' },
    { accessorKey: 'type', header: 'Type', type: 'badge', sortable: true, filterable: true, groupable: true },
    { accessorKey: 'contact_email', header: 'Email', type: 'email', sortable: true, filterable: true },
    { accessorKey: 'contact_phone', header: 'Phone', type: 'phone' },
    { accessorKey: 'status', header: 'Status', type: 'status', sortable: true, filterable: true, groupable: true },
    { accessorKey: 'rating', header: 'Rating', type: 'number', sortable: true, align: 'center' },
    { accessorKey: 'created_at', header: 'Created', type: 'date', sortable: true },
];

export const requirementColumns: ColumnConfig<any>[] = [
    { accessorKey: 'project.title', header: 'Project', sortable: true, filterable: true },
    { accessorKey: 'type', header: 'Type', type: 'badge', sortable: true, filterable: true, groupable: true },
    { accessorKey: 'description', header: 'Description', filterable: true },
    { accessorKey: 'priority', header: 'Priority', type: 'status', sortable: true, filterable: true, groupable: true,
        statusColors: {
            high: 'bg-red-100 text-red-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-green-100 text-green-800',
        }
    },
    { accessorKey: 'status', header: 'Status', type: 'status', sortable: true, filterable: true, groupable: true },
    { accessorKey: 'assigned_firm.name', header: 'Assigned Firm', sortable: true, filterable: true },
    { accessorKey: 'assigned_user.name', header: 'Assigned To', sortable: true, filterable: true },
];

export const taskColumns: ColumnConfig<any>[] = [
    { accessorKey: 'title', header: 'Title', sortable: true, filterable: true },
    { accessorKey: 'project.title', header: 'Project', sortable: true, filterable: true },
    { accessorKey: 'status', header: 'Status', type: 'status', sortable: true, filterable: true, groupable: true,
        statusColors: {
            todo: 'bg-gray-100 text-gray-800',
            'in progress': 'bg-blue-100 text-blue-800',
            done: 'bg-green-100 text-green-800',
        }
    },
    { accessorKey: 'assigned_user.name', header: 'Assigned To', sortable: true, filterable: true },
    { accessorKey: 'due_date', header: 'Due Date', type: 'date', sortable: true },
    { accessorKey: 'created_at', header: 'Created', type: 'date', sortable: true },
];

export const documentColumns: ColumnConfig<any>[] = [
    { accessorKey: 'name', header: 'Name', sortable: true, filterable: true },
    { accessorKey: 'project.title', header: 'Project', sortable: true, filterable: true },
    { accessorKey: 'uploaded_by.name', header: 'Uploaded By', sortable: true, filterable: true },
    { accessorKey: 'status', header: 'Status', type: 'status', sortable: true, filterable: true, groupable: true },
    { accessorKey: 'version', header: 'Version', type: 'number', sortable: true, align: 'center' },
    { accessorKey: 'tags', header: 'Tags', type: 'badge' },
    { accessorKey: 'created_at', header: 'Uploaded', type: 'datetime', sortable: true },
];

export const userColumns: ColumnConfig<any>[] = [
    { accessorKey: 'name', header: 'Name', sortable: true, filterable: true },
    { accessorKey: 'email', header: 'Email', type: 'email', sortable: true, filterable: true },
    { accessorKey: 'firm.name', header: 'Firm', sortable: true, filterable: true },
    { accessorKey: 'created_at', header: 'Created', type: 'date', sortable: true },
];