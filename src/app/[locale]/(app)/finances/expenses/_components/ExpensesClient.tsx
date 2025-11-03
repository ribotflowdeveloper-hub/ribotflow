// src/app/[locale]/(app)/finances/expenses/_components/ExpensesClient.tsx
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
import { deleteExpense } from '../[expenseId]/actions'; // Assegura't que deleteExpense està importat
// Pas 1: Importar el nou hook genèric i els tipus
import {
  usePaginatedResource,
  type PaginatedResponse,
  type PaginatedActionParams
} from '@/hooks/usePaginateResource';
import { PageHeader } from '@/components/shared/PageHeader'; // <-- Importa PageHeader
import { ExpenseFilters } from './ExpenseFilters'; // <-- Importa ExpenseFilters
// Pas 2: Importar les Server Actions específiques
import { fetchPaginatedExpenses} from '../actions';
// Importa els tipus des del fitxer de tipus principal d'expenses
import type { ExpenseWithContact } from '@/types/finances/expenses';
import type { ExpensePageFilters } from '@/lib/services/finances/expenses/expenses.service';


// ✅ NOU: Importem ActionResult per a la funció adaptadora
import { type ActionResult } from '@/types/shared/actionResult';

// ✅ ======================================
// ✅ PROP INTERFACE ACTUALITZADA
// ✅ ======================================
interface ExpensesClientProps {
  initialData: PaginatedExpensesResponse;
  filterOptions: {
    categories: string[];
  };
}
// Definim el tipus de resposta per a claredat
type PaginatedExpensesResponse = PaginatedResponse<ExpenseWithContact>;
// Definim el tipus dels paràmetres de la nostra 'fetchAction'
type FetchExpensesParams = PaginatedActionParams<ExpensePageFilters>;

// ✅ Definim les opcions de files per pàgina que volem
const EXPENSE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export function ExpensesClient({ initialData, filterOptions }: ExpensesClientProps) {
  const locale = useLocale();
  const t = useTranslations('ExpensesPage');
  const tShared = useTranslations('Shared');

  // La definició de columnes no canvia
  const allColumns = useMemo<ColumnDef<ExpenseWithContact>[]>(() => [
    {
      accessorKey: "invoice_number",
      header: t('table.number'),
      enableSorting: true,
      // ✅ Fem que la cel·la sigui un enllaç
      cell: (row) => {
        const displayNumber = row.invoice_number || `EXP-${String(row.id).substring(0, 6)}`;
        return (
          <Link
            href={`/${locale}/finances/expenses/${row.id}`}
            className="text-green-600 hover:underline font-medium" // Estil opcional
            title={`${tShared('actions.view')}: ${displayNumber}`} // Tooltip millorat
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
      // ✅ Fem que la cel·la sigui un enllaç condicional
      cell: (row) => {
        if (row.suppliers) {
          return (
            <Link
              href={`/${locale}/finances/suppliers/${row.suppliers.id}`}
              className="text-primary hover:underline font-medium" // Estil opcional
              title={`${tShared('actions.view')}: ${row.suppliers.nom}`} // Tooltip millorat
            >
              {row.suppliers.nom}
            </Link>
          );
        }
        return <span className="text-muted-foreground italic">{t('noSupplier')}</span>; // Estil per diferenciar-lo
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
        <Link href={`/${locale}/finances/expenses/${row.id}`} title={tShared('actions.edit')}>
          <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
        </Link>
      ),
    }
  ], [locale, t, tShared]);
  // Pas 4: Cridar el hook genèric amb la configuració de 'Despeses'
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
    // ✅ Rebem els nous valors del hook
    rowsPerPage,
    handleRowsPerPageChange,
    // rowsPerPageOptions, // Podem obtenir-lo del hook o definir-lo aquí
  } = usePaginatedResource<ExpenseWithContact, ExpensePageFilters>({
    initialData,
    initialFilters: { category: 'all', status: 'all' },
    initialSort: { column: 'expense_date', order: 'desc' },
    allColumns,
    fetchAction: fetchPaginatedExpenses as (params: FetchExpensesParams) => Promise<PaginatedExpensesResponse>,
    // ✅ CORRECCIÓ DE L'ERROR ts(2355):
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'number') {
        const errorMessage = tShared('errors.invalidId') || "Error: L'ID per eliminar no és vàlid.";
        console.error(errorMessage, { id });
        // 👇 Faltava aquest return
        return { success: false, message: errorMessage };
      }
      // Si id és un número, cridem la funció original
      return deleteExpense(id);
    },    // ✅ Passem el valor inicial desitjat i les opcions
    initialRowsPerPage: EXPENSE_ROWS_PER_PAGE_OPTIONS[0], // Comencem amb 10
    rowsPerPageOptions: EXPENSE_ROWS_PER_PAGE_OPTIONS,
    toastMessages: {
      deleteSuccess: t('toast.deleteSuccess'),
    }
  });

  // La lògica de 'visibleColumns' i 'deleteDescription' no canvia
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
  // ✅ Log 8: Verifiquem les filterOptions rebudes com a prop
  console.log("ExpensesClient: Received filterOptions prop:", filterOptions);

  // Extraiem les categories per claredat (opcional)
  const categoriesForFilter = filterOptions?.categories || [];

  // ✅ Log 9: Verifiquem l'array de categories que es passarà a ExpenseFilters
  console.log("ExpensesClient: Categories extracted for filter component:", categoriesForFilter);

  return (
<div className="h-full flex flex-col gap-4"> {/* Afegit gap-4 */}

      {/* ✅ Substituïm la capçalera manual per PageHeader */}
      <PageHeader title={t('title')}>
         {/* El botó "Nova Despesa" va com a 'children' */}
         <Button asChild>
           <Link href={`/${locale}/finances/expenses/new`}>
             <Plus className="w-4 h-4 mr-1" /> {t('newExpenseButton')}
           </Link>
         </Button>
      </PageHeader>

      {/* ✅ ====================================== */}
      {/* ✅ PASSEM LES CATEGORIES AL FILTRE       */}
      {/* ✅ ====================================== */}
      {/* ✅ Contenidor per a filtres i botó de columnes */}
      <div className="flex justify-between items-center"> {/* Marge inferior per separar de la taula */}
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

      {/* ✅ Passem les noves props a GenericDataTable */}
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
        deleteTitleKey='ExpensesPage.deleteDialog.title'
        deleteDescription={deleteDescription}
        emptyStateMessage={t('emptyState')}

        // Propietats de paginació
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}

        // ✅ Noves props
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={EXPENSE_ROWS_PER_PAGE_OPTIONS} // Passem les opcions definides
      />
    </div>
  );
}