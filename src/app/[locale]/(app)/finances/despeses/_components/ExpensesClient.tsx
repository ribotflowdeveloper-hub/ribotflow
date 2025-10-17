// src/app/[locale]/(app)/finances/despeses/_components/expenses-client.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Edit } from 'lucide-react'; 
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils/utils';
import { ExpenseWithContact, EXPENSE_STATUS_MAP } from '@/types/finances/expenses'; 
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { useExpenses } from '../_hooks/useExpenses'; 
import { formatCurrency, formatLocalizedDate } from '@/lib/utils/formatters'; 

const TEXT_CONTRAST_MAP: Record<string, string> = {
    'bg-gray-100': 'text-gray-800',
    'bg-yellow-100': 'text-yellow-800',
    'bg-blue-100': 'text-blue-800',
    'bg-green-600': 'text-white',
    'bg-red-600': 'text-white',
};

export function ExpensesClient({ initialExpenses }: { initialExpenses: ExpenseWithContact[] }) {
    const t = useTranslations('ExpensesPage');
    const tShared = useTranslations('Shared'); 
    const locale = useLocale();

    const {
        isPending,
        expenses, 
        expenseToDelete,
        setExpenseToDelete,
        handleSort,
        handleDelete,
        currentSortColumn,
        currentSortOrder,
    } = useExpenses({ initialExpenses, t }); 

    // ✅ CORRECCIÓ FINAL: La definició de les columnes ara rep 'row' directament.
    const columns: ColumnDef<ExpenseWithContact>[] = [
        {
            accessorKey: "invoice_number", 
            header: t('table.number'),
            enableSorting: true,
            cell: (row) => row.invoice_number || `EXP-${String(row.id).substring(0, 6)}`,
            cellClassName: "font-medium",
        },
        {
            accessorKey: "suppliers.nom", 
            header: t('table.supplier'),
            enableSorting: true,
            cell: (row) => row.suppliers?.nom || t('noSupplier'),
        },
        {
            accessorKey: "description",
            header: t('table.description'),
            enableSorting: false, 
            cell: (row) => <span className="max-w-[150px] truncate">{row.description}</span>,
        },
        {
            accessorKey: "expense_date",
            header: t('table.date'),
            enableSorting: true,
            cell: (row) => formatLocalizedDate(row.expense_date, "PPP", locale),
        },
        {
            accessorKey: "total_amount",
            header: t('table.total'),
            enableSorting: true,
            cell: (row) => formatCurrency(row.total_amount),
        },
        {
            accessorKey: "category",
            header: t('table.category'),
            enableSorting: true,
            cell: (row) => row.category || t('noCategory'),
        },
        {
            accessorKey: "status",
            header: t('table.status'),
            enableSorting: true,
            cell: (row) => {
                const statusInfo = EXPENSE_STATUS_MAP.find(s => s.dbValue === row.status) || { key: 'unknown', colorClass: 'bg-gray-100' };
                const textClass = TEXT_CONTRAST_MAP[statusInfo.colorClass] || 'text-gray-800';
                
                return (
                    <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        statusInfo.colorClass,
                        textClass,
                        "min-w-[70px] inline-flex justify-center" 
                    )}>
                        {t(`status.${statusInfo.key}`)}
                    </span>
                );
            },
        },
        {
            accessorKey: "actions_edit",
            header: "", 
            enableSorting: false,
            cell: (row) => (
                <Link href={`/${locale}/finances/despeses/${row.id}`} className="inline-flex items-center justify-center h-8 w-8" title={tShared('actions.edit')}>
                    <Edit className="w-4 h-4" />
                </Link>
            ),
            cellClassName: "text-right",
        }
    ];

    const deleteDescription = (
        <p>
            {tShared('deleteDialog.description1')} <span className="font-bold">{expenseToDelete?.invoice_number || expenseToDelete?.id}</span>.
            <br />
            {tShared('deleteDialog.description2')}
        </p>
    );

    return (
        <>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <Button asChild>
                    <Link href={`/${locale}/finances/despeses/new`}> 
                        <Plus className="w-4 h-4 mr-2" /> {t('newExpenseButton')} 
                    </Link>
                </Button>
            </div>
            
            <GenericDataTable
                data={expenses}
                columns={columns}
                onSort={handleSort}
                currentSortColumn={currentSortColumn}
                currentSortOrder={currentSortOrder}
                isPending={isPending}
                onDelete={handleDelete}
                deleteItem={expenseToDelete}
                setDeleteItem={setExpenseToDelete}
                deleteTitleKey='deleteDialog.title'
                deleteDescription={deleteDescription}
                emptyStateMessage={t('emptyState')}
            />
        </>
    );
}