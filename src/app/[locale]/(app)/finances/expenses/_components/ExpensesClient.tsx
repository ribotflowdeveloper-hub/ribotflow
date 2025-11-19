"use client";

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, TriangleAlert, CheckSquare, Square, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLocale, useTranslations } from 'next-intl';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { formatCurrency, formatLocalizedDate } from '@/lib/utils/formatters';
import { deleteExpense } from '../[expenseId]/actions'; // Assegura't que aquesta acció existeix i funciona
import {
  usePaginatedResource,
  type PaginatedResponse,
} from '@/hooks/usePaginateResource';
import { PageHeader } from '@/components/shared/PageHeader';
import { ExpenseFilters } from './ExpenseFilters';
import { fetchPaginatedExpensesAction, deleteBulkExpensesAction } from '../actions'; // Importem l'acció correcta amb Action al final

// ✅ IMPORTACIÓ UNIFICADA
import type { EnrichedExpense, ExpenseCategory } from '@/types/finances/expenses';
import type { ExpensePageFilters } from '@/lib/services/finances/expenses/expenses.service';
import { type ActionResult } from '@/types/shared/actionResult';
import { useMultiSelect } from '@/hooks/useMultiSelect'; 

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
import ExcelDropdownButton from '@/components/features/excel/ExcelDropdownButton';
import { useExcelActions } from '@/components/features/excel/useExelActions';
import { type UsageCheckResult } from '@/lib/subscription/subscription';
import { cn } from '@/lib/utils/utils';

interface ExpensesClientProps {
  initialData: PaginatedExpensesResponse;
  filterOptions: {
    categories: ExpenseCategory[];
  };
  expenseLimitStatus: UsageCheckResult | null;
}

type PaginatedExpensesResponse = PaginatedResponse<EnrichedExpense>;
const EXPENSE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// Objecte Dummy per senyalitzar eliminació massiva
// Utilitzem 'as unknown' per evitar errors de tipus estrictes en camps que no farem servir per esborrar
const BULK_DELETE_ITEM = {
  id: -1,
  invoice_number: 'BULK_DELETE',
  total_amount: 0,
  expense_date: new Date().toISOString(),
  status: 'paid', 
  isBulk: true
} as unknown as EnrichedExpense; // Cast a EnrichedExpense perquè GenericDataTable no es queixi

export function ExpensesClient({
  initialData,
  filterOptions,
  expenseLimitStatus 
}: ExpensesClientProps) {
  const locale = useLocale();
  const t = useTranslations('ExpensesPage');
  const tShared = useTranslations('Shared');
  const t_billing = useTranslations('Shared.limits');
  const router = useRouter(); 
  const tActions = useTranslations('Shared.actions');
  
  const {
    isPending: isExcelPending, 
    excelOptions,
    handleExcelAction
  } = useExcelActions({
    tableName: 'expenses',
    limitStatus: expenseLimitStatus,
    translationKeys: {
      create: 'expenses.create',
      load: 'expenses.load',
      download: 'expenses.download',
      limit: 'expenses', 
    }
  });
  
  const [showLimitModal, setShowLimitModal] = useState(false);
  const isLimitExceeded = expenseLimitStatus && !expenseLimitStatus.allowed;


  const allColumns = useMemo<ColumnDef<EnrichedExpense>[]>(() => [
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
      accessorKey: "suppliers.nom", // Accessor complex per ordenació, cell personalitzada
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
      accessorKey: "category_name", // Utilitzem el camp enriquit
      header: t('table.category'),
      enableSorting: true, 
      cell: (row) => row.category_name || t('noCategory'), 
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
    isPending: isTablePending,
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
  } = usePaginatedResource<EnrichedExpense, ExpensePageFilters>({
    initialData,
    initialFilters: { category: 'all', status: 'all' },
    initialSort: { column: 'expense_date', order: 'desc' },
    allColumns,
    // Passem l'acció amb el tipus correcte
    fetchAction: fetchPaginatedExpensesAction,
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

  const {
    isMultiSelectActive, selectedItems, isBulkDeletePending,
    onToggleMultiSelect, onSelectAll, onSelectItem, handleBulkDelete, clearSelection,
  } = useMultiSelect<EnrichedExpense>({
    data: expenses,
    bulkDeleteAction: (ids: (string | number)[]) => {
      const numberIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      return deleteBulkExpensesAction(numberIds);
    },
    toastMessages: { bulkDeleteSuccess: t('toast.bulkDeleteSuccess'), bulkDeleteError: tShared('errors.genericDeleteError'), },
    onDeleteSuccess: () => { handleSort(currentSortColumn || 'expense_date'); },
  });

  useEffect(() => { clearSelection(); }, [page, searchTerm, filters, clearSelection]);

  const isBulkDeletionMode = isMultiSelectActive && selectedItems.length > 0;
  // Comprovació segura de l'objecte dummy
  const isBulkDeletionDialog = expenseToDelete === BULK_DELETE_ITEM;

  const handleUnifiedDelete = () => {
    if (isBulkDeletionDialog) {
      handleBulkDelete();
    } else if (expenseToDelete) {
      handleDelete(); 
    }
  };

  const visibleColumns = useMemo(
    () => allColumns.filter(col => columnVisibility[col.accessorKey.toString()] ?? true),
    [allColumns, columnVisibility]
  );

  const deleteTitleKey = isBulkDeletionDialog ? 'Shared.deleteDialog.titleBulk' : 'ExpensesPage.deleteDialog.title';

  const deleteDescription = useMemo(() => {
    if (isBulkDeletionDialog) {
      return tShared('deleteDialog.descriptionBulk', { count: selectedItems.length });
    }

    const itemNumber = expenseToDelete
      ? expenseToDelete.invoice_number || `EXP-${expenseToDelete.id}`
      : tShared('deleteDialog.defaultRecord');

    return (
      <>
        {tShared('deleteDialog.description1')}{' '}
        <span className="font-bold">{itemNumber}</span>.
        <br />
        {tShared('deleteDialog.description2')}
      </>
    );
  }, [expenseToDelete, isBulkDeletionDialog, selectedItems.length, tShared]);

  const handleNewExpenseClick = () => {
    if (isLimitExceeded) { setShowLimitModal(true); } else { router.push(`/${locale}/finances/expenses/new`); }
  };

  // ... (El render (JSX) es manté igual que el teu codi original)
  // Només assegura't que <GenericDataTable> rep <EnrichedExpense>
  
  return (
     // ... (copia el JSX del teu missatge anterior, és correcte)
     // Només canvia el GenericDataTable type:
     // <GenericDataTable<EnrichedExpense> ... />
     <div className="h-full flex flex-col gap-3 md:gap-4">

      <div className="sticky top-0 z-10 bg-background border-b shadow-sm py-3 px-4 sm:px-0">
        <PageHeader title={t('title')}>

          {isLimitExceeded && (
            <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900 p-2 max-w-md">
              <TriangleAlert className="h-4 w-4 text-yellow-900" />
              <AlertTitle className="font-semibold text-xs mb-0"> {t_billing('modalTitle', { default: 'Límit assolit' })} </AlertTitle>
              <AlertDescription className="text-xs">
                {expenseLimitStatus!.error || t_billing('expensesPerMonth', { current: expenseLimitStatus!.current, max: expenseLimitStatus!.max })}
                <Button asChild variant="link" size="sm" className="p-0 h-auto ml-1 text-yellow-900 font-semibold underline">
                  <Link href={`/${locale}/settings/billing`}>{t_billing('upgradeButton')}</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <ExcelDropdownButton
            options={excelOptions} onSelect={handleExcelAction}
            disabled={isExcelPending || isTablePending || isMultiSelectActive}
          />

          <Button onClick={handleNewExpenseClick} disabled={isTablePending || isExcelPending || isMultiSelectActive} className="w-full sm:w-auto">
            <PlusCircle className="w-4 h-4 mr-1" /> {t('newExpenseButton')}
          </Button>

        </PageHeader>
      </div>

      <div className="flex justify-between items-start gap-4 px-2 sm:px-0">
        <div className="flex items-center gap-2 flex-grow">
          <Button
            variant={isMultiSelectActive ? "secondary" : "ghost"}
            size="icon"
            onClick={onToggleMultiSelect}
            title={isMultiSelectActive ? tActions('cancelSelection') : tActions('selectItems')}
            disabled={isTablePending || isExcelPending}
            className={cn("flex-shrink-0 h-8 w-8", (isTablePending || isExcelPending) && "opacity-50 pointer-events-none")}
          >
            {isMultiSelectActive ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span className="sr-only">{isMultiSelectActive ? tActions('cancelSelection') : tActions('selectItems')}</span>
          </Button>

          {isBulkDeletionMode && (
            <Button
              variant="destructive" size="sm"
              onClick={() => setExpenseToDelete(BULK_DELETE_ITEM)}
              disabled={selectedItems.length === 0 || isBulkDeletePending || isTablePending || isExcelPending}
              className="flex-shrink-0"
            >
              {(isBulkDeletePending || isTablePending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Trash2 className="w-4 h-4 mr-2" />
              {tActions('deleteCount', { count: selectedItems.length })}
            </Button>
          )}

          <ExpenseFilters
            searchTerm={searchTerm} onSearchChange={handleSearchChange} filters={filters} onFilterChange={handleFilterChange}
            categories={filterOptions.categories}
          />
        </div>

        <ColumnToggleButton allColumns={allColumns} columnVisibility={columnVisibility} toggleColumnVisibility={toggleColumnVisibility} />
      </div>

      <div className="flex-grow overflow-x-auto px-2 sm:px-0">
        <GenericDataTable<EnrichedExpense>
          data={expenses}
          columns={visibleColumns}
          onSort={handleSort} currentSortColumn={currentSortColumn} currentSortOrder={currentSortOrder as 'asc' | 'desc' | null}
          isPending={isExcelPending || isTablePending || isBulkDeletePending}
          onDelete={handleUnifiedDelete} 
          deleteItem={expenseToDelete} setDeleteItem={setExpenseToDelete}
          deleteTitleKey={deleteTitleKey} deleteDescription={deleteDescription} emptyStateMessage={t('emptyState')}
          page={page} totalPages={totalPages} onPageChange={handlePageChange} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={EXPENSE_ROWS_PER_PAGE_OPTIONS}
          isMultiSelectActive={isMultiSelectActive} selectedItems={selectedItems} onToggleMultiSelect={onToggleMultiSelect}
          onSelectAll={onSelectAll} onSelectItem={onSelectItem} onBulkDelete={handleBulkDelete} isBulkDeletePending={isBulkDeletePending}
        />
      </div>

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