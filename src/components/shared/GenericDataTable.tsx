// src/components/shared/GenericDataTable.tsx
"use client";

import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { useTranslations } from 'next-intl';

import {
    Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink,
} from "@/components/ui/pagination";
import {
    ChevronLeftIcon, ChevronRightIcon, DoubleArrowLeftIcon, DoubleArrowRightIcon
} from '@radix-ui/react-icons';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
// 🆕 Importem Checkbox
import { Checkbox } from '@/components/ui/checkbox';


export type ColumnDef<TData> = {
    accessorKey: keyof TData | string;
    header: React.ReactNode | string;
    cell: (row: TData) => React.ReactNode;
    enableSorting?: boolean;
    cellClassName?: string;
    headerClassName?: string;
};

// 🌟 Interfície actualitzada amb props de MultiSelect
interface GenericDataTableProps<TData extends { id: string | number }> {
    data: TData[];
    columns: ColumnDef<TData>[];
    onSort: (column: string) => void;
    currentSortColumn: string | null;
    currentSortOrder: 'asc' | 'desc' | null;
    isPending: boolean;
    onDelete: (id: string | number) => void; // Individual delete
    deleteItem: TData | null;
    setDeleteItem: (item: TData | null) => void;
    deleteTitleKey: string;
    deleteDescription: React.ReactNode;
    emptyStateMessage: string;
    className?: string;

    // Propietats de paginació
    page: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
    rowsPerPage: number;
    onRowsPerPageChange: (newRowsPerPage: number) => void;
    rowsPerPageOptions?: number[];

    // 🆕 NOVES PROPIETATS PER A MULTI SELECCIÓ
    isMultiSelectActive: boolean;
    selectedItems: (string | number)[];
    onToggleMultiSelect: () => void;
    onSelectAll: (checked: boolean) => void;
    onSelectItem: (id: string | number, checked: boolean) => void;
    onBulkDelete: (ids: (string | number)[]) => void;
    isBulkDeletePending: boolean;
}

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

export function GenericDataTable<TData extends { id: string | number }>({
    data, columns, onSort, currentSortColumn, currentSortOrder, isPending,
    onDelete, deleteItem, setDeleteItem, deleteTitleKey, deleteDescription,
    emptyStateMessage, className, page, totalPages, onPageChange, rowsPerPage,
    onRowsPerPageChange, rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS,
    // 🆕 NOVES PROPS
    isMultiSelectActive, selectedItems, onSelectAll, onSelectItem, onBulkDelete, isBulkDeletePending,
}: GenericDataTableProps<TData>): React.ReactElement {
    const t = useTranslations('Shared');
    const tPagination = useTranslations('Shared.pagination');
    const tActions = useTranslations('Shared.actions');

    // Càlculs de selecció
    const isAllSelected = selectedItems.length > 0 && selectedItems.length === data.length;
    const isSomeSelected = selectedItems.length > 0 && selectedItems.length < data.length;

    // 🌟 Manejador d'eliminació unificat
    const handleDelete = () => {
        // Aquesta funció crida al handler unificat del pare (InvoicesClient.tsx)
        if (isBulkDeletion) {
            onBulkDelete(selectedItems);
        } else if (deleteItem && typeof deleteItem === 'object' && 'id' in deleteItem) {
            onDelete((deleteItem as { id: string | number }).id);
        }
    };

    // 🔑 CLAU: Detecció d'eliminació massiva DINS del diàleg
    // Assumim que l'objecte dummy té una propietat única, p. ex., id: -1
    const isBulkDeletion = deleteItem !== null && typeof deleteItem === 'object' && 'id' in deleteItem && (deleteItem as { id: string | number }).id === -1;

    const dialogTitle = isBulkDeletion
        ? t('deleteDialog.titleBulk', { count: selectedItems.length })
        : t(deleteTitleKey);

    const dialogDescriptionText = isBulkDeletion
        ? deleteDescription // El component pare ja l'haurà preparat per BULK
        : deleteDescription;

    const isDeletePending = isPending || isBulkDeletePending;

    // 🔑 CLAU: El diàleg S'OBRE NOMÉS si deleteItem NO ÉS NULL (sigui real o DUMMY).
    const isDeleteDialogOpen = useMemo(() => !!deleteItem, [deleteItem]);

    // 🔑 CLAU: Funció per tancar el diàleg i netejar l'estat.
    const handleCloseDialog = useCallback(() => {
        // CORRECCIÓ 1: Neteja l'estat d'obertura
        setDeleteItem(null);
        // Desmarquem si era eliminació massiva (per cancel·lació)
        if (isBulkDeletion && isMultiSelectActive) {
            onSelectAll(false);
        }
    }, [setDeleteItem, isBulkDeletion, isMultiSelectActive, onSelectAll]);

    const SortableHeader = ({ column }: { column: ColumnDef<TData> }) => {
        const key = column.accessorKey.toString();
        const isCurrentSort = currentSortColumn === key;
        return (
            <TableHead
                onClick={column.enableSorting ? () => onSort(key) : undefined}
                className={cn(column.enableSorting ? "cursor-pointer hover:bg-muted/50 transition-colors" : "", column.headerClassName)}
            >
                <div className="flex items-center gap-2">
                    {column.header}
                    {column.enableSorting && (
                        isCurrentSort ? (
                            <span className="text-foreground text-xs">{currentSortOrder === 'asc' ? '▲' : '▼'}</span>
                        ) : (
                            <ArrowUpDown className="w-4 h-4 text-muted-foreground/30" />
                        )
                    )}
                </div>
            </TableHead>
        );
    };

    const PaginationControls = () => {
        // ... (Codi de PaginationControls sense canvis)
        if (totalPages <= 1 && rowsPerPageOptions.length === 0) return null;

        const handlePageClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, newPage: number) => {
            e.preventDefault();
            if (newPage >= 1 && newPage <= totalPages) {
                onPageChange(newPage);
            }
        };

        const handleRowsPerPageChangeInternal = (value: string) => {
            onRowsPerPageChange(Number(value));
        };

        const renderPaginationItems = () => {
            const items = [];
            const siblingCount = 1;
            const totalPageNumbersToShow = siblingCount * 2 + 1;

            if (totalPages <= totalPageNumbersToShow + 2) {
                for (let i = 1; i <= totalPages; i++) {
                    items.push(
                        <PaginationItem key={i}>
                            <PaginationLink
                                href="#"
                                onClick={(e) => handlePageClick(e, i)}
                                isActive={page === i}
                            >
                                {i}
                            </PaginationLink>
                        </PaginationItem>
                    );
                }
            } else {
                const leftSiblingIndex = Math.max(page - siblingCount, 1);
                const rightSiblingIndex = Math.min(page + siblingCount, totalPages);

                const shouldShowLeftEllipsis = leftSiblingIndex > 2;
                const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

                items.push(
                    <PaginationItem key={1}>
                        <PaginationLink
                            href="#"
                            onClick={(e) => handlePageClick(e, 1)}
                            isActive={page === 1}
                        >
                            1
                        </PaginationLink>
                    </PaginationItem>
                );

                if (shouldShowLeftEllipsis) {
                    items.push(<PaginationEllipsis key="start-ellipsis" />);
                }

                const startMiddle = shouldShowLeftEllipsis ? leftSiblingIndex : 2;
                const endMiddle = shouldShowRightEllipsis ? rightSiblingIndex : totalPages - 1;
                for (let i = startMiddle; i <= endMiddle; i++) {
                    items.push(
                        <PaginationItem key={i}>
                            <PaginationLink
                                href="#"
                                onClick={(e) => handlePageClick(e, i)}
                                isActive={page === i}
                            >
                                {i}
                            </PaginationLink>
                        </PaginationItem>
                    );
                }

                if (shouldShowRightEllipsis) {
                    items.push(<PaginationEllipsis key="end-ellipsis" />);
                }

                if (totalPages > 1) {
                    items.push(
                        <PaginationItem key={totalPages}>
                            <PaginationLink
                                href="#"
                                onClick={(e) => handlePageClick(e, totalPages)}
                                isActive={page === totalPages}
                            >
                                {totalPages}
                            </PaginationLink>
                        </PaginationItem>
                    );
                }
            }

            return items;
        };


        return (
            <div className="flex items-center justify-between mt-4 px-2">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>{tPagination('rowsPerPage')}</span>
                    <Select value={String(rowsPerPage)} onValueChange={handleRowsPerPageChangeInternal}>
                        <SelectTrigger className="h-8 w-[70px] bg-card border border-input">
                            <SelectValue placeholder={rowsPerPage} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {rowsPerPageOptions.map(option => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn("h-8 w-8", page === 1 ? "pointer-events-none opacity-50 bg-card" : undefined)}
                                onClick={(e) => handlePageClick(e, 1)}
                                disabled={page === 1}
                                aria-label={tPagination('firstPage')}
                            >
                                <DoubleArrowLeftIcon className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn("h-8 w-8", page === 1 ? "pointer-events-none opacity-50 bg-card" : undefined)}
                                onClick={(e) => handlePageClick(e, page - 1)}
                                disabled={page === 1}
                                aria-label={tPagination('previous')}
                            >
                                <ChevronLeftIcon className="h-4 w-4" />
                            </Button>
                        </PaginationItem>

                        {renderPaginationItems()}

                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn("h-8 w-8", page >= totalPages ? "pointer-events-none opacity-50 bg-card" : undefined)}
                                onClick={(e) => handlePageClick(e, page + 1)}
                                disabled={page >= totalPages}
                                aria-label={tPagination('next')}
                            >
                                <ChevronRightIcon className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn("h-8 w-8", page >= totalPages ? "pointer-events-none opacity-50 bg-card" : undefined)}
                                onClick={(e) => handlePageClick(e, totalPages)}
                                disabled={page >= totalPages}
                                aria-label={tPagination('lastPage')}
                            >
                                <DoubleArrowRightIcon className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>

                <div className="text-sm text-muted-foreground">
                    {tPagination('pageInfo', { currentPage: page, totalPages: totalPages })}
                </div>
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn("relative h-full flex flex-col", className, isPending && "opacity-50 pointer-events-none")}
        >
            {isPending && (<div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20"><Loader2 className="w-8 h-8 animate-spin" /></div>)}

            <div className="flex-grow overflow-y-auto bg-card rounded-xl shadow-lg border border-border min-h-0">
                <Table className="relative">
                    <TableHeader className="sticky top-0 bg-card shadow-sm z-10">
                        <TableRow>
                            {/* 🆕 Columna de Checkbox per a Selecció Massiva/Individual */}
                            {isMultiSelectActive && (
                                <TableHead className="w-[30px] p-0 pl-4">
                                    <Checkbox
                                        checked={isAllSelected}
                                        onCheckedChange={(checked) => onSelectAll(!!checked)}
                                        aria-label={tActions('selectAll')}
                                        disabled={isPending || data.length === 0}
                                        // Utilitzem l'estat isSomeSelected per a l'estat indeterminat (barreta)
                                        className={isSomeSelected ? "data-[state=unchecked]:bg-accent data-[state=unchecked]:border-primary" : undefined}
                                    />
                                </TableHead>
                            )}

                            {columns.map((column, index) => (<SortableHeader key={index} column={column} />))}
                            <TableHead className="text-right">{t('table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? data.map(row => {
                            const isRowSelected = selectedItems.includes(row.id);

                            return (
                                <TableRow key={row.id} data-state={isRowSelected && isMultiSelectActive ? "selected" : undefined}>
                                    {/* 🆕 Checkbox per a l'ítem individual */}
                                    {isMultiSelectActive && (
                                        <TableCell className="w-[30px] p-0 pl-4">
                                            <Checkbox
                                                checked={isRowSelected}
                                                onCheckedChange={(checked) => onSelectItem(row.id, !!checked)}
                                                aria-label={tActions('selectItem')}
                                            />
                                        </TableCell>
                                    )}

                                    {columns.map((column, index) => (
                                        <TableCell key={index} className={cn("py-1", column.cellClassName)}>
                                            {column.cell(row)}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right py-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title={tActions('delete')}
                                            onClick={() => setDeleteItem(row)}
                                            disabled={isPending || isMultiSelectActive} // Deshabilitem en mode selecció
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        }) : (
                            <TableRow>
                                {/* +1 per la nova columna de checkbox */}
                                <TableCell colSpan={columns.length + (isMultiSelectActive ? 2 : 1)} className="text-center h-24 text-muted-foreground">{emptyStateMessage}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <PaginationControls />

            {/* 🌟 Diàleg d'Eliminació (tant individual com massiva) */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
                if (!open) {
                    handleCloseDialog(); // 🔑 CLAU: Crida al tancament
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {dialogDescriptionText}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        {/* El botó Cancel·lar funciona correctament amb onOpenChange(false) */}
                        <AlertDialogCancel disabled={isDeletePending}>{t('deleteDialog.cancelButton')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeletePending}>
                            {isDeletePending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isDeletePending ? t('deleteDialog.deleting') : t('deleteDialog.confirmButton')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </motion.div>
    );
}