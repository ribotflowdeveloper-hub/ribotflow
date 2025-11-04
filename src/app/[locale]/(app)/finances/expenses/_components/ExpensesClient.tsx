"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocale, useTranslations } from 'next-intl';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { formatCurrency, formatLocalizedDate } from '@/lib/utils/formatters';
import { deleteExpense } from '../[expenseId]/actions';
import {
  usePaginatedResource,
  type PaginatedResponse,
  type PaginatedActionParams
} from '@/hooks/usePaginateResource';
import { PageHeader } from '@/components/shared/PageHeader';
import { ExpenseFilters } from './ExpenseFilters';
import { fetchPaginatedExpenses } from '../actions';
import type { ExpenseWithContact } from '@/types/finances/expenses';
import type { ExpensePageFilters } from '@/lib/services/finances/expenses/expenses.service';
import { type ActionResult } from '@/types/shared/actionResult';

interface ExpensesClientProps {
  initialData: PaginatedExpensesResponse;
  filterOptions: { categories: string[] };
}

type PaginatedExpensesResponse = PaginatedResponse<ExpenseWithContact>;
type FetchExpensesParams = PaginatedActionParams<ExpensePageFilters>;
const EXPENSE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function ExpensesClient({ initialData, filterOptions }: ExpensesClientProps) {
  const locale = useLocale();
  const t = useTranslations('ExpensesPage');
  const tShared = useTranslations('Shared');

  const allColumns = useMemo<ColumnDef<ExpenseWithContact>[]>(() => [
    {
      accessorKey: "invoice_number",
      header: t('table.number'),
      enableSorting: true,
      cell: (row) => {
        const displayNumber = row.invoice_number || `EXP-${String(row.id).substring(0, 6)}`;
        return (
          <Link
            href={`/${locale}/finances/expenses/${row.id}`}
            className="text-green-600 hover:underline font-medium"
            title={`${tShared('actions.view')}: ${displayNumber}`}
          >
            {displayNumber}
          </Link>
        );
      },
    },
    {
      accessorKey: "suppliers.nom",
      header: t('table.supplier'),
      enableSorting: true,
      cell: (row) => {
        if (row.suppliers) {
          return (
            <Link
              href={`/${locale}/finances/suppliers/${row.suppliers.id}`}
              className="text-primary hover:underline font-medium"
              title={`${tShared('actions.view')}: ${row.suppliers.nom}`}
            >
              {row.suppliers.nom}
            </Link>
          );
        }
        return <span className="text-muted-foreground italic">{t('noSupplier')}</span>;
      },
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
        <Badge
          variant={row.status === 'paid'
            ? 'success'
            : row.status === 'overdue'
              ? 'destructive'
              : 'secondary'} className={undefined}        >
          {t(`status.${row.status}`)}
        </Badge>
      ),
    },
    {
      accessorKey: "actions_edit",
      header: "",
      enableSorting: false,
      cell: (row) => (
        <Link href={`/${locale}/finances/expenses/${row.id}`} title={tShared('actions.edit')}>
          <Button variant="ghost" size="icon">
            <Edit className="w-4 h-4" />
          </Button>
        </Link>
      ),
    },
  ], [locale, t, tShared]);

  const {
    isPending,
    data: expenses,
    itemToDelete: expenseToDelete,
    setItemToDelete: setExpenseToDelete,
    handleDelete,
    handleSort,
    currentSortColumn,
    currentSortOrder,
    searchTerm,
    handleSearchChange,
    filters,
    handleFilterChange,
    columnVisibility,
    toggleColumnVisibility,
    page,
    totalPages,
    handlePageChange,
    rowsPerPage,
    handleRowsPerPageChange,
  } = usePaginatedResource<ExpenseWithContact, ExpensePageFilters>({
    initialData,
    initialFilters: { category: 'all', status: 'all' },
    initialSort: { column: 'expense_date', order: 'desc' },
    allColumns,
    fetchAction: fetchPaginatedExpenses as (params: FetchExpensesParams) => Promise<PaginatedExpensesResponse>,
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'number') {
        return { success: false, message: tShared('errors.invalidId') };
      }
      return deleteExpense(id);
    },
    initialRowsPerPage: EXPENSE_ROWS_PER_PAGE_OPTIONS[0],
    rowsPerPageOptions: EXPENSE_ROWS_PER_PAGE_OPTIONS,
    toastMessages: { deleteSuccess: t('toast.deleteSuccess') },
  });

  const visibleColumns = useMemo(
    () => allColumns.filter(col => columnVisibility[col.accessorKey.toString()] ?? true),
    [allColumns, columnVisibility]
  );

  const deleteDescription = (
    <>
      {tShared('deleteDialog.description1')}{' '}
      <span className="font-bold">{expenseToDelete?.invoice_number || expenseToDelete?.id}</span>.
      <br />
      {tShared('deleteDialog.description2')}
    </>
  );

  return (
    <div className="h-full flex flex-col gap-3 md:gap-4">

      {/* 🧾 Header compacte i responsive */}
      <div className="sticky top-0 z-10 bg-background border-b shadow-sm py-3 px-4 sm:px-0">
        <PageHeader title={t('title')}>
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/${locale}/finances/expenses/new`}>
              <Plus className="w-4 h-4 mr-1" /> {t('newExpenseButton')}
            </Link>
          </Button>
        </PageHeader>
      </div>

      {/* 🔍 Filtres i columnes responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 px-2 sm:px-0">
        <ExpenseFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          categories={filterOptions.categories}
        />
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      {/* 📊 Taula amb scroll suau */}
      <div className="flex-grow overflow-x-auto">
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
          deleteTitleKey="ExpensesPage.deleteDialog.title"
          deleteDescription={deleteDescription}
          emptyStateMessage={t('emptyState')}
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={EXPENSE_ROWS_PER_PAGE_OPTIONS}
        />
      </div>
    </div>
  );
}
