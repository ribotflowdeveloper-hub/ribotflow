// src/app/[locale]/(app)/finances/despeses/_components/expenses-client.tsx
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocale, useTranslations } from 'next-intl';

// ❌ Pas 1: Eliminem les importacions de paginació
// import {
//   Pagination,
//   PaginationContent,
//   PaginationEllipsis,
//   PaginationItem,
//   PaginationLink,
//   PaginationNext,
//   PaginationPrevious,
// } from "@/components/ui/pagination";

import { type ExpenseWithContact } from '@/types/finances/expenses';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { useExpenses } from '../_hooks/useExpenses';
import { formatCurrency, formatLocalizedDate } from '@/lib/utils/formatters';
import { ExpenseFilters } from './ExpenseFilters';
import { type PaginatedExpensesResponse } from '../actions';

export function ExpensesClient({ initialData }: { initialData: PaginatedExpensesResponse }) {
  const locale = useLocale();
  const t = useTranslations('ExpensesPage');
  const tShared = useTranslations('Shared');

  // ... (useMemo d'allColumns no canvia)
    const allColumns = useMemo<ColumnDef<ExpenseWithContact>[]>(() => [
        {
            accessorKey: "invoice_number",
            header: t('table.number'),
            enableSorting: true,
            cell: (row) => row.invoice_number || `EXP-${String(row.id).substring(0, 6)}`,
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
            accessorKey: 'status',
            header: t('table.status'),
            enableSorting: true,
            cell: (row) => (
                <Badge variant={row.status === 'paid' ? 'success' :
                    row.status === 'overdue' ? 'destructive' :
                        'secondary'} className={undefined}>
                    {t(`status.${row.status}`)}
                </Badge>
            )
        },
        {
            accessorKey: "actions_edit",
            header: "",
            enableSorting: false,
            cell: (row) => (
                <Link href={`/${locale}/finances/despeses/${row.id}`} title={tShared('actions.edit')}>
                    <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
                </Link>
            ),
        }
    ], [locale, t, tShared]);

  const {
    isPending,
    expenses,
    expenseToDelete,
    setExpenseToDelete,
    handleDelete,
    handleSort,
    currentSortColumn,
    currentSortOrder,
    searchTerm,
    filters,
    handleSearchChange,
    handleCategoryChange,
    columnVisibility,
    toggleColumnVisibility,
    handleStatusChange,
    page,
    totalPages,
    handlePageChange,
  } = useExpenses({ initialData, allColumns });

  const visibleColumns = useMemo(
    () => allColumns.filter(col => columnVisibility[col.accessorKey.toString()] ?? true),
    [allColumns, columnVisibility]
  );

  const deleteDescription = (
    <>
      {tShared('deleteDialog.description1')} <span className="font-bold">{expenseToDelete?.invoice_number || expenseToDelete?.id}</span>.
      <br />
      {tShared('deleteDialog.description2')}
    </>
  );

  // ❌ Pas 2: Eliminem tot el component 'PaginationControls'
  // const PaginationControls = () => { ... }

  return (
    <div className="h-full flex flex-col"> 
      {/* ... (Header i Filtres sense canvis) ... */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button asChild>
          <Link href={`/${locale}/finances/despeses/new`}>
            <Plus className="w-4 h-4 " /> {t('newExpenseButton')}
          </Link>
        </Button>
      </div>

      <div className="flex justify-between items-center ">
        <ExpenseFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          category={filters.category}
          onCategoryChange={handleCategoryChange}
          status={filters.status}
          onStatusChange={handleStatusChange}
        />
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      {/* ✅ Pas 3: Passem les propietats de paginació a GenericDataTable */}
      <GenericDataTable
        className="flex-grow overflow-hidden" 
        data={expenses}
        columns={visibleColumns}
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
        
        // Propietats de paginació
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />


    </div>
  );
}