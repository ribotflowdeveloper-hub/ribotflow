"use client";

// ✅ 1. Importem 'useState', 'useRouter' i components necessaris
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Importem useRouter
import { Button } from '@/components/ui/button';
import { Plus, Edit, TriangleAlert } from 'lucide-react'; // ✅ Importem 'TriangleAlert'
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
import type { ExpenseWithContact, ExpenseCategory } from '@/types/finances/expenses';
import type { ExpensePageFilters } from '@/lib/services/finances/expenses/expenses.service';
import { type ActionResult } from '@/types/shared/actionResult';

// ✅ 2. Importem els components d'Alerta i Modal
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ✅ 3. Importem el tipus del límit
import { type UsageCheckResult } from '@/lib/subscription/subscription';

// ✅ 4. Actualitzem les Props
interface ExpensesClientProps {
  initialData: PaginatedExpensesResponse;
  filterOptions: {
    categories: ExpenseCategory[] // 👈 CANVIAT: Ara és un array d'objectes
  };
  expenseLimitStatus: UsageCheckResult | null;
}

type PaginatedExpensesResponse = PaginatedResponse<ExpenseWithContact>;
type FetchExpensesParams = PaginatedActionParams<ExpensePageFilters>;
const EXPENSE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function ExpensesClient({
  initialData,
  filterOptions,
  expenseLimitStatus // ✅ 5. Rebem la prop
}: ExpensesClientProps) {
  const locale = useLocale();
  const t = useTranslations('ExpensesPage');
  const tShared = useTranslations('Shared');
  const t_billing = useTranslations('Shared.limits');
  const router = useRouter(); // Per al modal i el botó

  // ✅ 6. Estat per al modal i comprovació del límit
  const [showLimitModal, setShowLimitModal] = useState(false);
  const isLimitExceeded = expenseLimitStatus && !expenseLimitStatus.allowed;

  const allColumns = useMemo<ColumnDef<ExpenseWithContact>[]>(() => [
    // ... (columnes sense canvis, com les has definit)
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
      // ✅ CANVIAT: El 'accessorKey' ara és 'category_name' (o el que retorni l'RPC)
      // Si el teu tipus 'ExpenseWithContact' no té 'category_name', 
      // utilitza 'category' (que vam mapejar al servei)
      accessorKey: "category",
      header: t('table.category'),
      enableSorting: true, // Hauríem d'ordenar per 'category_name' a l'RPC
      cell: (row) => row.category || t('noCategory'), // 'category' ara conté el nom
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
              : 'secondary'} className={undefined}
        >
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

  // ✅ 7. Gestor pel botó "Nova Despesa"
  const handleNewExpenseClick = () => {
    if (isLimitExceeded) {
      setShowLimitModal(true); // Mostra el modal si se supera el límit
    } else {
      router.push(`/${locale}/finances/expenses/new`); // Navega si tot està bé
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 md:gap-4">

      <div className="sticky top-0 z-10 bg-background border-b shadow-sm py-3 px-4 sm:px-0">
        <PageHeader title={t('title')}>

          {/* ✅ 8. Alerta de límit (només si se supera) */}
          {isLimitExceeded && (
            <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900 p-2 max-w-md">
              <TriangleAlert className="h-4 w-4 text-yellow-900" />
              <AlertTitle className="font-semibold text-xs mb-0">
                {t_billing('modalTitle', { default: 'Límit assolit' })}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {expenseLimitStatus.error || t_billing('expensesPerMonth', { current: expenseLimitStatus.current, max: expenseLimitStatus.max })}
                <Button asChild variant="link" size="sm" className="p-0 h-auto ml-1 text-yellow-900 font-semibold underline">
                  <Link href={`/${locale}/settings/billing`}>{t_billing('upgradeButton')}</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* ✅ 9. Botó ara utilitza el gestor onClick */}
          <Button onClick={handleNewExpenseClick} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1" /> {t('newExpenseButton')}
          </Button>

        </PageHeader>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 px-2 sm:px-0">
        <ExpenseFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          categories={filterOptions.categories} />
        
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

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

      {/* ✅ 10. Modal de bloqueig (si l'usuari clica el botó) */}
      <AlertDialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="text-destructive" />
              {t_billing('modalTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t_billing('expensesPerMonth', {
                current: expenseLimitStatus?.current ?? 0,
                max: expenseLimitStatus?.max ?? 0
              })}
              <br />
              {t_billing('upgradePlan')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tShared('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(`/${locale}/settings/billing`)}>
              {t_billing('upgradeButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}