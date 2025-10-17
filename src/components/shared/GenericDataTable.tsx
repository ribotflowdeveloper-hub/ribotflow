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

// 1. Tipus de Columna Genèric 
// Defineix com ha de ser una columna. TData és el tipus de dada (e.g., Expense, Quote)
export type ColumnDef<TData> = {
    // La clau per ordenar i accedir a la dada. Si és una clau simple, 'key' és TData
    // Si és una propietat nested (com 'contacts.nom'), es gestiona dins del 'cell' o 'onSort'
    accessorKey: keyof TData | string; 
    header: React.ReactNode | string;
    // Funció que renderitza el contingut de la cel·la per a cada fila
    cell: (row: TData) => React.ReactNode;
    // Opcional: si la columna és ordenable
    enableSorting?: boolean; 
    // Opcional: classes de Tailwind per a la cel·la
    cellClassName?: string;
    // Opcional: classes de Tailwind per a la capçalera
    headerClassName?: string;
};

// 2. Propietats del Component DataTable
interface GenericDataTableProps<TData extends { id: string | number }> {
    data: TData[];
    columns: ColumnDef<TData>[];
    // Funció que es crida quan es clica un header ordenable
    onSort: (column: string) => void; 
    // Paràmetres d'ordenació actuals per mostrar la icona
    currentSortColumn: string | null;
    currentSortOrder: 'asc' | 'desc' | null;
    // Estat de càrrega per a les operacions
    isPending: boolean;
    // Lògica d'eliminació
    onDelete: () => void;
    deleteItem: TData | null;
    setDeleteItem: (item: TData | null) => void;
    deleteTitleKey: string; // clau d'i18n per al títol
    deleteDescription: React.ReactNode; // Descripció del diàleg
    emptyStateMessage: string;
}

// 3. Component Principal
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
}: GenericDataTableProps<TData>) {
    const t = useTranslations('Shared'); // Assumint un fitxer d'i18n compartit per a les accions

    // Component intern per a les capçaleres ordenables
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

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn("relative", isPending && "opacity-50 pointer-events-none")}>
                {isPending && (<div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10"><Loader2 className="w-8 h-8 animate-spin" /></div>)}
                
                <div className="bg-card rounded-xl shadow-lg border border-border"> 
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((column, index) => (
                                    <SortableHeader key={index} column={column} />
                                ))}
                                {/* Columna d'Accions Fixa */}
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
                                    {/* Cel·la d'Accions dinàmica */}
                                    <TableCell className="text-right py-1">
                                        {/* Acció d'Edició (Requereix Link/Button específic en la implementació) */}
                                        {/* L'enllaç d'edició s'ha de passar com a prop o injectar dins el 'cell' de l'última columna si és més complex */}
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
            </motion.div>

            {/* Diàleg d'Eliminació Reutilitzable */}
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
        </>
    );
}