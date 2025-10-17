// src/app/[locale]/(app)/finances/despeses/_components/expenses-client.tsx
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocale, useTranslations } from 'next-intl'; // Mantenim useTranslations aquí per a més flexibilitat
import { type ExpenseWithContact } from '@/types/finances/expenses';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { useExpenses } from '../_hooks/useExpenses';
import { formatCurrency, formatLocalizedDate } from '@/lib/utils/formatters';
import { ExpenseFilters } from './ExpenseFilters';

export function ExpensesClient({ initialExpenses }: { initialExpenses: ExpenseWithContact[] }) {
  const locale = useLocale();
  // ✅ Centralitzem les traduccions aquí per claredat. El hook no necessita gestionar-les.
  const t = useTranslations('ExpensesPage');
  const tShared = useTranslations('Shared');

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
    // ✅ NOU: Columna 'status'
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
    handleStatusChange, // ✅ NOU
  } = useExpenses({ initialExpenses, allColumns });

  const visibleColumns = useMemo(
    () => allColumns.filter(col => columnVisibility[col.accessorKey.toString()] ?? true),
    [allColumns, columnVisibility]
  );

  // ✅ Movem la definició de 'deleteDescription' dins del component
  // per a què tingui accés a 'tShared' i 'expenseToDelete'.
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

      <div className="flex justify-between items-center">
        <ExpenseFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          category={filters.category}
          onCategoryChange={handleCategoryChange}
          status={filters.status} // ✅ NOU
          onStatusChange={handleStatusChange} // ✅ NOU
        />
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      <GenericDataTable
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
      />
    </>
  );
}