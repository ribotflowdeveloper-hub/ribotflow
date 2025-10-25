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

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
// ✅ Importem les icones necessàries
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  DoubleArrowLeftIcon, // <-- Primera pàgina
  DoubleArrowRightIcon // <-- Última pàgina
} from '@radix-ui/react-icons';
// ✅ Importem el component Select
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ColumnDef<TData> = {
    accessorKey: keyof TData | string;
    header: React.ReactNode | string;
    cell: (row: TData) => React.ReactNode;
    enableSorting?: boolean;
    cellClassName?: string;
    headerClassName?: string;
};

// ✅ Pas 1: Afegim les noves propietats a la interfície
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

    // Propietats de paginació existents
    page: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;

    // ✅ Noves propietats per files per pàgina
    rowsPerPage: number;
    onRowsPerPageChange: (newRowsPerPage: number) => void;
    rowsPerPageOptions?: number[]; // Opcional, per defecte [10, 20, 50]
}

const DEFAULT_ROWS_PER_PAGE_OPTIONS = [10, 20, 50];

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
    rowsPerPage, // <-- Nova prop
    onRowsPerPageChange, // <-- Nova prop
    rowsPerPageOptions = DEFAULT_ROWS_PER_PAGE_OPTIONS, // <-- Nova prop amb valor per defecte
}: GenericDataTableProps<TData>): React.ReactElement {
    const t = useTranslations('Shared');
    const tPagination = useTranslations('Shared.pagination'); // Namespace per a paginació

    // ... (Component intern SortableHeader no canvia) ...
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

    // ✅ Refactoritzem PaginationControls i renderPaginationItems
    const PaginationControls = () => {
        if (totalPages <= 1 && rowsPerPageOptions.length === 0) return null;

        const handlePageClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, newPage: number) => {
            e.preventDefault();
            // Validació simple per assegurar que la pàgina és vàlida abans de cridar onPageChange
            if (newPage >= 1 && newPage <= totalPages) {
              onPageChange(newPage);
            }
        };

        const handleRowsPerPageChangeInternal = (value: string) => {
            onRowsPerPageChange(Number(value));
        };

        // ✅ ======================================
        // ✅ LÒGICA MILLORADA PER RENDERITZAR ITEMS
        // ✅ ======================================
        const renderPaginationItems = () => {
            const items = [];
            // Definim quants botons volem al voltant de la pàgina activa (ex: prev, actual, next = 3)
            const siblingCount = 1; // 1 a cada costat de la pàgina actual
            const totalPageNumbersToShow = siblingCount * 2 + 1; // Total de números al bloc central

            // --- CAS 1: Poques pàgines en total ---
            // Si el nombre total de pàgines és menor o igual al que volem mostrar + els extrems + els ellipsis
            if (totalPages <= totalPageNumbersToShow + 2) { // +2 per la primera i última pàgina potencialment separades
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
            }
            // --- CAS 2: Moltes pàgines, necessitem ellipsis ---
            else {
                const leftSiblingIndex = Math.max(page - siblingCount, 1);
                const rightSiblingIndex = Math.min(page + siblingCount, totalPages);

                const shouldShowLeftEllipsis = leftSiblingIndex > 2;
                const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1;

                // 1. Sempre mostrem la primera pàgina
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

                // 2. Mostrem ellipsis esquerre si cal
                if (shouldShowLeftEllipsis) {
                    items.push(<PaginationEllipsis key="start-ellipsis" />);
                }

                // 3. Mostrem els números del mig (al voltant de l'actual)
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

                // 4. Mostrem ellipsis dret si cal
                if (shouldShowRightEllipsis) {
                    items.push(<PaginationEllipsis key="end-ellipsis" />);
                }

                // 5. Sempre mostrem l'última pàgina
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
            <div className="flex items-center justify-between mt-4 px-2">
                {/* Selector de Files per Pàgina */}
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

                {/* Controls de Paginació */}
                <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                        {/* Botó Primera Pàgina */}
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn("h-8 w-8", page === 1 ? "pointer-events-none opacity-50 bg-card" : undefined)}
                                onClick={(e) => handlePageClick(e, 1)} // Passem l'event
                                disabled={page === 1}
                                aria-label={tPagination('firstPage')}
                            >
                                <DoubleArrowLeftIcon className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                        {/* Botó Anterior */}
                        <PaginationItem>
                           <Button
                                variant="outline"
                                size="icon"
                                className={cn("h-8 w-8", page === 1 ? "pointer-events-none opacity-50 bg-card" : undefined)}
                                onClick={(e) => handlePageClick(e, page - 1)} // Passem l'event
                                disabled={page === 1}
                                aria-label={tPagination('previous')}
                            >
                                <ChevronLeftIcon className="h-4 w-4" />
                            </Button>
                        </PaginationItem>

                        {/* Números de Pàgina amb Ellipsis */}
                        {renderPaginationItems()}

                         {/* Botó Següent */}
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn("h-8 w-8", page >= totalPages ? "pointer-events-none opacity-50 bg-card" : undefined)} // >= per seguretat
                                onClick={(e) => handlePageClick(e, page + 1)} // Passem l'event
                                disabled={page >= totalPages}
                                aria-label={tPagination('next')}
                            >
                                <ChevronRightIcon className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                         {/* Botó Última Pàgina */}
                        <PaginationItem>
                            <Button
                                variant="outline"
                                size="icon"
                                className={cn("h-8 w-8", page >= totalPages ? "pointer-events-none opacity-50 bg-card" : undefined)} // >= per seguretat
                                onClick={(e) => handlePageClick(e, totalPages)} // Passem l'event
                                disabled={page >= totalPages}
                                aria-label={tPagination('lastPage')}
                           >
                                <DoubleArrowRightIcon className="h-4 w-4" />
                            </Button>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>

                 {/* Informació de Pàgina Actual */}
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

            {/* Renderitzem els nous controls de paginació */}
            <PaginationControls />

            {/* ... (AlertDialog no canvia) ... */}
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