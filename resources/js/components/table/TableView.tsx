import React, { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    getGroupedRowModel,
    getExpandedRowModel,
    flexRender,
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    GroupingState,
    ExpandedState,
    VisibilityState,
    RowSelectionState,
    Row,
} from '@tanstack/react-table';
import {
    Search,
    Filter,
    Plus,
    Download,
    Upload,
    Columns3,
    SortAsc,
    SortDesc,
    ChevronDown,
    ChevronRight,
    MoreHorizontal,
    Settings2,
    Layers,
    Eye,
    EyeOff,
    Copy,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';

interface TableViewProps<TData> {
    data: TData[];
    columns: ColumnDef<TData>[];
    title: string;
    modelName: string;
    searchFields?: string[];
    createRoute?: string;
    editRoute?: (row: TData) => string;
    deleteRoute?: (row: TData) => string;
    viewRoute?: (row: TData) => string;
    breadcrumbs?: Array<{ title: string; href?: string }>;
    enableGrouping?: boolean;
    enableExport?: boolean;
    enableImport?: boolean;
    defaultPageSize?: number;
}

export function TableView<TData extends Record<string, any>>({
    data,
    columns: initialColumns,
    title,
    modelName,
    searchFields = [],
    createRoute,
    editRoute,
    deleteRoute,
    viewRoute,
    breadcrumbs = [],
    enableGrouping = true,
    enableExport = true,
    enableImport = false,
    defaultPageSize = 20,
}: TableViewProps<TData>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [grouping, setGrouping] = useState<GroupingState>([]);
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [pageSize, setPageSize] = useState(defaultPageSize);

    // Add selection column
    const selectionColumn: ColumnDef<TData> = {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                }
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
                className="translate-y-[2px]"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="translate-y-[2px]"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    };

    // Add actions column
    const actionsColumn: ColumnDef<TData> = {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
            const item = row.original;

            return (
                <div className="flex justify-end">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {viewRoute && (
                                <DropdownMenuItem asChild>
                                    <Link href={viewRoute(item)} className="flex items-center">
                                        <Eye className="mr-2 h-4 w-4" />
                                        View
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            {editRoute && (
                                <DropdownMenuItem asChild>
                                    <Link href={editRoute(item)} className="flex items-center">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            {item.id && (
                                <DropdownMenuItem
                                    onClick={() => navigator.clipboard.writeText(String(item.id))}
                                >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy ID
                                </DropdownMenuItem>
                            )}
                            {deleteRoute && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-red-600 dark:text-red-400"
                                        asChild
                                    >
                                        <Link
                                            href={deleteRoute(item)}
                                            method="delete"
                                            as="button"
                                            className="flex items-center w-full"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </Link>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
        enableSorting: false,
        enableHiding: false,
    };

    const columns = useMemo(
        () => [selectionColumn, ...initialColumns, actionsColumn],
        [initialColumns]
    );

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            grouping,
            expanded,
            globalFilter,
            pagination: {
                pageSize,
                pageIndex: 0,
            },
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGroupingChange: setGrouping,
        onExpandedChange: setExpanded,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getGroupedRowModel: getGroupedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        globalFilterFn: 'includesString',
        enableGrouping,
    });

    const selectedCount = Object.keys(rowSelection).length;

    return (
        <div className="w-full space-y-4">
            {/* Breadcrumbs */}
            <Breadcrumbs breadcrumbs={[...breadcrumbs, { title: title }]} />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage and organize your {modelName.toLowerCase()}s
                    </p>
                </div>
                {createRoute && (
                    <Button asChild className="gap-2">
                        <Link href={createRoute}>
                            <Plus className="h-4 w-4" />
                            Add {modelName}
                        </Link>
                    </Button>
                )}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg border">
                {/* Top Toolbar */}
                <div className="flex items-center gap-2">
                    {/* Global Search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder={`Search ${modelName.toLowerCase()}s...`}
                            value={globalFilter ?? ''}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            className="pl-9 pr-4"
                        />
                    </div>

                    {/* Filters */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Filter className="h-4 w-4" />
                                Filter
                                {columnFilters.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 px-1.5">
                                        {columnFilters.length}
                                    </Badge>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[250px]">
                            <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanFilter())
                                .map((column) => (
                                    <div key={column.id} className="p-2">
                                        <div className="text-sm font-medium mb-1 capitalize">
                                            {column.id.replace(/_/g, ' ')}
                                        </div>
                                        <Input
                                            placeholder={`Filter ${column.id}...`}
                                            value={(column.getFilterValue() as string) ?? ''}
                                            onChange={(e) =>
                                                column.setFilterValue(e.target.value)
                                            }
                                            className="h-8"
                                        />
                                    </div>
                                ))}
                            {columnFilters.length > 0 && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setColumnFilters([])}
                                        className="text-sm"
                                    >
                                        Clear all filters
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Grouping */}
                    {enableGrouping && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Layers className="h-4 w-4" />
                                    Group
                                    {grouping.length > 0 && (
                                        <Badge variant="secondary" className="ml-1 px-1.5">
                                            {grouping.length}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px]">
                                <DropdownMenuLabel>Group by</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {table
                                    .getAllColumns()
                                    .filter((column) => column.getCanGroup())
                                    .map((column) => (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            checked={grouping.includes(column.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setGrouping([...grouping, column.id]);
                                                } else {
                                                    setGrouping(
                                                        grouping.filter((g) => g !== column.id)
                                                    );
                                                }
                                            }}
                                            className="capitalize"
                                        >
                                            {column.id.replace(/_/g, ' ')}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                {grouping.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setGrouping([])}>
                                            Clear grouping
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Column Visibility */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Columns3 className="h-4 w-4" />
                                Columns
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id.replace(/_/g, ' ')}
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Separator orientation="vertical" className="h-8" />

                    {/* Export/Import */}
                    {enableExport && (
                        <Button variant="outline" size="sm" className="gap-2">
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                    )}
                    {enableImport && (
                        <Button variant="outline" size="sm" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Import
                        </Button>
                    )}
                </div>

                {/* Selected Actions */}
                {selectedCount > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                            {selectedCount} row{selectedCount !== 1 ? 's' : ''} selected
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRowSelection({})}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                            Clear selection
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-white dark:bg-gray-900 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div className="flex items-center gap-2">
                                                    {header.column.getCanGroup() &&
                                                        grouping.includes(header.column.id) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={header.column.getToggleExpandedHandler()}
                                                                className="p-0 h-auto"
                                                            >
                                                                {header.column.getIsExpanded() ? (
                                                                    <ChevronDown className="h-4 w-4" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        )}
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {header.column.getCanSort() && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={header.column.getToggleSortingHandler()}
                                                            className="p-0 h-auto ml-1"
                                                        >
                                                            {header.column.getIsSorted() === 'asc' ? (
                                                                <SortAsc className="h-4 w-4" />
                                                            ) : header.column.getIsSorted() === 'desc' ? (
                                                                <SortDesc className="h-4 w-4" />
                                                            ) : (
                                                                <div className="h-4 w-4 opacity-30">
                                                                    <SortAsc />
                                                                </div>
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={cn(
                                            'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                                            row.getIsSelected() && 'bg-blue-50 dark:bg-blue-950'
                                        )}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td
                                                key={cell.id}
                                                className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100"
                                            >
                                                {cell.getIsGrouped() ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={row.getToggleExpandedHandler()}
                                                        className="p-0 h-auto"
                                                    >
                                                        {row.getIsExpanded() ? (
                                                            <ChevronDown className="h-4 w-4 mr-1" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 mr-1" />
                                                        )}
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}{' '}
                                                        ({row.subRows.length})
                                                    </Button>
                                                ) : cell.getIsAggregated() ? (
                                                    flexRender(
                                                        cell.column.columnDef.aggregatedCell ??
                                                            cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )
                                                ) : cell.getIsPlaceholder() ? null : (
                                                    flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="h-24 text-center text-gray-500 dark:text-gray-400"
                                    >
                                        No results found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Showing{' '}
                            <span className="font-medium">
                                {table.getState().pagination.pageIndex * pageSize + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-medium">
                                {Math.min(
                                    (table.getState().pagination.pageIndex + 1) * pageSize,
                                    data.length
                                )}
                            </span>{' '}
                            of <span className="font-medium">{data.length}</span> results
                        </span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(value) => {
                                setPageSize(Number(value));
                                table.setPageSize(Number(value));
                            }}
                        >
                            <SelectTrigger className="h-8 w-[70px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 20, 30, 40, 50, 100].map((size) => (
                                    <SelectItem key={size} value={String(size)}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-700 dark:text-gray-300">per page</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.setPageIndex(0)}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Page
                            </span>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {table.getState().pagination.pageIndex + 1} of{' '}
                                {table.getPageCount()}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                            disabled={!table.getCanNextPage()}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}