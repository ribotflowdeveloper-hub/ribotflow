// src/components/shared/GenericDataTable.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { useTranslations } from 'next-intl';

// ✅ Pas 1: Importem els components de paginació i les icones
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';

export type ColumnDef<TData> = {
    accessorKey: keyof TData | string;
    header: React.ReactNode | string;
    cell: (row: TData) => React.ReactNode;
    enableSorting?: boolean;
    cellClassName?: string;
    headerClassName?: string;
};

// ✅ Pas 2: Afegim les noves propietats de paginació a la interfície
interface GenericDataTableProps<TData extends { id: string | number }> {
    data: TData[];
    columns: ColumnDef<TData>[];
    onSort: (column: string) => void;
    currentSortColumn: string | null;
    currentSortOrder: 'asc' | 'desc' | null;
    isPending: boolean;
    onDelete: () => void;
    deleteItem: TData | null;
    setDeleteItem: (item: TData | null) => void;
    deleteTitleKey: string; 
    deleteDescription: React.ReactNode; 
    emptyStateMessage: string;
    className?: string;
    
    // Noves propietats per a la paginació
    page: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
}

export function GenericDataTable<TData extends { id: string | number }>({
    data,
    columns,
    onSort,
    currentSortColumn,
    currentSortOrder,
    isPending,
    onDelete,
    deleteItem,
    setDeleteItem,
    deleteTitleKey,
    deleteDescription,
    emptyStateMessage,
    className,
    page,
    totalPages,
    onPageChange,
}: GenericDataTableProps<TData>): React.ReactElement {
    const t = useTranslations('Shared'); 

    // ... (Component intern SortableHeader no canvia)
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

    // ✅ Pas 3: Creem el sub-component de paginació DINS de la taula
    const PaginationControls = () => {
        if (totalPages <= 1) return null;

        const handlePageClick = (e: React.MouseEvent<HTMLAnchorElement>, newPage: number) => {
            e.preventDefault();
            onPageChange(newPage);
        };

        const renderPaginationItems = () => {
            const items = [];
            const maxPagesToShow = 3; 
            const startPage = Math.max(2, page - Math.floor(maxPagesToShow / 2));
            const endPage = Math.min(totalPages - 1, page + Math.floor(maxPagesToShow / 2));

            // Primera pàgina
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

            if (startPage > 2) items.push(<PaginationEllipsis key="start-ellipsis" />);

            // Pàgines del mig
            for (let i = startPage; i <= endPage; i++) {
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

            if (endPage < totalPages - 1) items.push(<PaginationEllipsis key="end-ellipsis" />);

            // Última pàgina
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
            return items;
        };

        return (
            <Pagination className="mt-4">
                <PaginationContent>
                    {/* ✅ Pas 4: Botó "Previous" NOMÉS amb fletxa */}
                    <PaginationItem>
                        <PaginationLink
                            href="#"
                            size="icon" // <-- La clau és aquí
                            onClick={(e) => handlePageClick(e, page - 1)}
                            className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                            aria-label={t('pagination.previous') || 'Go to previous page'}
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </PaginationLink>
                    </PaginationItem>
                    
                    {renderPaginationItems()}
                    
                    {/* ✅ Pas 4: Botó "Next" NOMÉS amb fletxa */}
                    <PaginationItem>
                        <PaginationLink
                            href="#"
                            size="icon" // <-- La clau és aquí
                            onClick={(e) => handlePageClick(e, page + 1)}
                            className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
                            aria-label={t('pagination.next') || 'Go to next page'}
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </PaginationLink>
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        );
    };


    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className={cn("relative h-full flex flex-col", className, isPending && "opacity-50 pointer-events-none")} 
        >
            {isPending && (<div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20"><Loader2 className="w-8 h-8 animate-spin" /></div>)}

            {/* Contingut de la Taula (Scrollable Area) */}
            <div className="flex-grow overflow-y-auto bg-card rounded-xl shadow-lg border border-border min-h-0"> 
                <Table className="relative">
                    {/* ... (TableHeader i TableBody no canvien) ... */}
                    <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                        <TableRow>
                            {columns.map((column, index) => (<SortableHeader key={index} column={column} />))}
                            <TableHead className="text-right">{t('table.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length > 0 ? data.map(row => (
                            <TableRow key={row.id}>
                                {columns.map((column, index) => (
                                    <TableCell key={index} className={cn("py-1", column.cellClassName)}>
                                        {column.cell(row)}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right py-1">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        title={t('actions.delete')} 
                                        onClick={() => setDeleteItem(row)} 
                                        disabled={isPending}
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} className="text-center h-24">{emptyStateMessage}</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            
            {/* ✅ Pas 5: Renderitzem la paginació al final */}
            <PaginationControls />

            {/* Diàleg d'Eliminació (Sense canvis) */}
            <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t(deleteTitleKey)}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteDescription}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>{t('deleteDialog.cancelButton')}</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isPending ? t('deleteDialog.deleting') : t('deleteDialog.confirmButton')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}