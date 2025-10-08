import React, { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
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
    Layers,
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
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TableViewProps<TData> {
    data: TData[];
    columns: ColumnDef<TData>[];
    title: string;
    modelName: string;
    searchFields?: string[];
    enableGrouping?: boolean;
    enableExport?: boolean;
    enableImport?: boolean;
    defaultPageSize?: number;
    onRowClick?: (row: TData) => void;
    rowClickRoute?: string;
    onRowSelectionChange?: (selectedRows: TData[]) => void;
}

export function CompactTableView<TData extends Record<string, any>>({
    data,
    columns: initialColumns,
    title,
    modelName,
    searchFields = [],
    enableGrouping = true,
    enableExport = true,
    enableImport = false,
    defaultPageSize = 50,
    onRowClick,
    rowClickRoute,
    onRowSelectionChange,
}: TableViewProps<TData>) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [grouping, setGrouping] = useState<GroupingState>([]);
    const [expanded, setExpanded] = useState<ExpandedState>(true); // true means all groups expanded by default
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
                className="h-3 w-3"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="h-3 w-3"
            />
        ),
        enableSorting: false,
        enableHiding: false,
        enableGrouping: false,
    };

    const columns = useMemo(
        () => [selectionColumn, ...initialColumns],
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
        autoResetExpanded: false,
    });

    const selectedCount = Object.keys(rowSelection).length;

    // Notify parent component of selection changes
    useEffect(() => {
        if (onRowSelectionChange) {
            const selectedRows = table.getSelectedRowModel().rows.map(row => row.original);
            onRowSelectionChange(selectedRows);
        }
    }, [rowSelection, onRowSelectionChange]);

    return (
        <div className="w-full px-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2 py-2">
                {/* Global Search */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                    <Input
                        placeholder={`Search...`}
                        value={globalFilter ?? ''}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="pl-7 h-7 text-sm w-48"
                    />
                </div>

                {/* Filters */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-sm px-2 gap-1">
                            <Filter className="h-3 w-3" />
                            Filter
                            {columnFilters.length > 0 && (
                                <Badge variant="secondary" className="ml-1 px-1 h-4 text-[10px]">
                                    {columnFilters.length}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuLabel className="text-sm">Filter by</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanFilter())
                            .map((column) => (
                                <div key={column.id} className="p-1.5">
                                    <div className="text-sm font-medium mb-1 capitalize">
                                        {column.id.replace(/_/g, ' ')}
                                    </div>
                                    <Input
                                        placeholder={`Filter...`}
                                        value={(column.getFilterValue() as string) ?? ''}
                                        onChange={(e) =>
                                            column.setFilterValue(e.target.value)
                                        }
                                        className="h-6 text-sm"
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
                            <Button variant="outline" size="sm" className="h-7 text-sm px-2 gap-1">
                                <Layers className="h-3 w-3" />
                                Group
                                {grouping.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 px-1 h-4 text-[10px]">
                                        {grouping.length}
                                    </Badge>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[150px]">
                            <DropdownMenuLabel className="text-sm">Group by</DropdownMenuLabel>
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
                                                setExpanded(true); // Expand all when grouping
                                            } else {
                                                setGrouping(
                                                    grouping.filter((g) => g !== column.id)
                                                );
                                            }
                                        }}
                                        className="capitalize text-sm"
                                    >
                                        {column.id.replace(/_/g, ' ')}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            {grouping.length > 0 && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setGrouping([])} className="text-sm">
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
                        <Button variant="outline" size="sm" className="h-7 text-sm px-2 gap-1">
                            <Columns3 className="h-3 w-3" />
                            Columns
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[150px]">
                        <DropdownMenuLabel className="text-sm">Toggle columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {table
                            .getAllColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    className="capitalize text-sm"
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

                <div className="h-4 w-px bg-gray-300" />

                {/* Export/Import */}
                {enableExport && (
                    <Button variant="outline" size="sm" className="h-7 text-sm px-2 gap-1">
                        <Download className="h-3 w-3" />
                        Export
                    </Button>
                )}
                {enableImport && (
                    <Button variant="outline" size="sm" className="h-7 text-sm px-2 gap-1">
                        <Upload className="h-3 w-3" />
                        Import
                    </Button>
                )}

                {/* Selected Actions */}
                {selectedCount > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-gray-600">
                            {selectedCount} selected
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRowSelection({})}
                            className="h-6 text-sm px-2"
                        >
                            Clear
                        </Button>
                    </div>
                )}
            </div>

            {/* Excel-like Table */}
            <div className="border border-gray-300 rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id} className="bg-gray-100">
                                    {headerGroup.headers.filter(header => (!header.isPlaceholder || !grouping.length) && !grouping.includes(header.column.id)).map((header) => (
                                        <th
                                            key={header.id}
                                            className={cn(
                                                "border-r border-b border-gray-300 py-1 text-left text-sm font-medium text-gray-700 whitespace-nowrap",
                                                header.column.id === 'select' ? 'px-0.5 w-6 max-w-6' : 'px-2'
                                            )}
                                            style={header.column.id === 'select' ? { width: '24px', maxWidth: '24px' } : {}}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div className="flex items-center gap-1">
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {header.column.getCanSort() && (
                                                        <button
                                                            onClick={header.column.getToggleSortingHandler()}
                                                            className="p-0 hover:bg-gray-200 rounded"
                                                        >
                                                            {header.column.getIsSorted() === 'asc' ? (
                                                                <SortAsc className="h-3 w-3" />
                                                            ) : header.column.getIsSorted() === 'desc' ? (
                                                                <SortDesc className="h-3 w-3" />
                                                            ) : (
                                                                <SortAsc className="h-3 w-3 opacity-30" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row, rowIndex) => {
                                    // Check if this row is a group
                                    if (row.getIsGrouped()) {
                                        return (
                                            <tr key={row.id} className="bg-gray-100 font-semibold">
                                                <td
                                                    colSpan={columns.length}
                                                    className="border-r border-b border-gray-300 px-2 py-1"
                                                >
                                                    <button
                                                        onClick={row.getToggleExpandedHandler()}
                                                        className="flex items-center gap-1 w-full text-left"
                                                    >
                                                        {row.getIsExpanded() ? (
                                                            <ChevronDown className="h-3 w-3" />
                                                        ) : (
                                                            <ChevronRight className="h-3 w-3" />
                                                        )}
                                                        <span className="text-sm">
                                                            {row.groupingValue ?? 'None'}
                                                        </span>
                                                        <span className="ml-2 text-xs text-gray-500">
                                                            ({row.subRows.length})
                                                        </span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    // Regular data row
                                    const handleRowClick = () => {
                                        if (onRowClick) {
                                            onRowClick(row.original);
                                        } else if (rowClickRoute && row.original.id) {
                                            router.get(`/${rowClickRoute}/${row.original.id}`);
                                        }
                                    };

                                    return (
                                        <tr
                                            key={row.id}
                                            className={cn(
                                                'hover:bg-blue-50',
                                                row.getIsSelected() && 'bg-blue-100',
                                                rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50',
                                                (onRowClick || rowClickRoute) && 'cursor-pointer'
                                            )}
                                            onClick={handleRowClick}
                                        >
                                            {row.getVisibleCells().filter(cell => (!cell.getIsPlaceholder() || !grouping.length) && !grouping.includes(cell.column.id)).map((cell) => {
                                                return (
                                                    <td
                                                        key={cell.id}
                                                        className={cn(
                                                            "border-r border-b border-gray-300 py-0.5 text-sm text-gray-900 whitespace-nowrap",
                                                            cell.column.id === 'select' ? 'px-1 w-5' : 'px-2'
                                                        )}
                                                    >
                                                        {cell.getIsGrouped() ? (
                                                            // If it's a grouped cell, render it as a button
                                                            <button
                                                                onClick={row.getToggleExpandedHandler()}
                                                                className="flex items-center gap-1"
                                                            >
                                                                {row.getIsExpanded() ? (
                                                                    <ChevronDown className="h-3 w-3" />
                                                                ) : (
                                                                    <ChevronRight className="h-3 w-3" />
                                                                )}
                                                                {flexRender(
                                                                    cell.column.columnDef.cell,
                                                                    cell.getContext()
                                                                )}
                                                                <span className="ml-1 text-xs text-gray-500">
                                                                    ({row.subRows?.length})
                                                                </span>
                                                            </button>
                                                        ) : cell.getIsAggregated() ? (
                                                            // If the cell is aggregated, use the Aggregated renderer
                                                            flexRender(
                                                                cell.column.columnDef.aggregatedCell ??
                                                                    cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )
                                                        ) : cell.getIsPlaceholder() ? null : ( // For cells that are placeholders (expanded grouped rows)
                                                            flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="h-20 text-center text-sm text-gray-500"
                                    >
                                        No results found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                        Showing {table.getState().pagination.pageIndex * pageSize + 1} to{' '}
                        {Math.min(
                            (table.getState().pagination.pageIndex + 1) * pageSize,
                            data.length
                        )}{' '}
                        of {data.length}
                    </span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                            setPageSize(Number(value));
                            table.setPageSize(Number(value));
                        }}
                    >
                        <SelectTrigger className="h-6 w-16 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {[20, 50, 100, 200, 500].map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="h-6 w-6 p-0"
                    >
                        <ChevronsLeft className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-6 w-6 p-0"
                    >
                        <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-6 w-6 p-0"
                    >
                        <ChevronRightIcon className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="h-6 w-6 p-0"
                    >
                        <ChevronsRight className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}