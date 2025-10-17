// src/app/[locale]/(app)/finances/despeses/_components/expenses-client.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Edit } from 'lucide-react'; 
import { useLocale } from 'next-intl';
import { ExpenseWithContact } from '@/types/finances/expenses'; 
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { useExpenses } from '../_hooks/useExpenses'; 
import { formatCurrency, formatLocalizedDate } from '@/lib/utils/formatters'; 
import { ExpenseFilters } from './ExpenseFilters';

export function ExpensesClient({ initialExpenses }: { initialExpenses: ExpenseWithContact[] }) {
    const locale = useLocale();

    // ✅ Ara desestructurem 't' i 'tShared' directament des del hook
    const {
        isPending,
        expenses, 
        expenseToDelete,
        setExpenseToDelete,
        handleSort,
        handleDelete,
        currentSortColumn,
        currentSortOrder,
        searchTerm,
        filters,
        handleSearchChange,
        handleCategoryChange,
        t,
        tShared
    } = useExpenses({ initialExpenses }); 

    // ❌ La declaració duplicada s'ha eliminat

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
            {tShared('deleteDialog.description1')} <span className="font-bold">{expenseToDelete?.invoice_number || `ID ${expenseToDelete?.id}`}</span>.
            <br />
            {tShared('deleteDialog.description2')}
        </p>
    );

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <Button asChild>
                    <Link href={`/${locale}/finances/despeses/new`}> 
                        <Plus className="w-4 h-4 mr-2" /> {t('newExpenseButton')} 
                    </Link>
                </Button>
            </div>
            
            <ExpenseFilters 
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              category={filters.category}
              onCategoryChange={handleCategoryChange}
            />
            
            <GenericDataTable
                data={expenses}
                columns={columns}
                onSort={handleSort}
                currentSortColumn={currentSortColumn}
                currentSortOrder={currentSortOrder as 'asc' | 'desc' | null}
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