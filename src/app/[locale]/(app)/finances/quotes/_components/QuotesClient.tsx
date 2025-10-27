"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Edit } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader'; // Importa PageHeader
// Tipus i Accions
import { type QuoteWithContact, type QuotePageFilters, fetchPaginatedQuotes, deleteQuoteAction } from '../actions';
import { type ActionResult } from '@/types/shared/actionResult';
import { usePathname } from 'next/navigation'; // ✅ 1. Importar usePathname
// Components Compartits
import { Button } from '@/components/ui/button';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { Badge } from '@/components/ui/badge';

// Components Específics
import { QuotesFilters } from './QuotesFilters';

// Hook Genèric
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource';

// Utilitats
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';
import { QUOTE_STATUS_MAP } from '@/config/styles/quotes';

// Alias i Constants
type PaginatedQuotesResponse = PaginatedResponse<QuoteWithContact>;
type FetchQuotesParams = PaginatedActionParams<QuotePageFilters>;
const QUOTE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

interface QuotesClientProps {
  initialData: PaginatedQuotesResponse;
}

export function QuotesClient({ initialData }: QuotesClientProps) {
  const t = useTranslations('QuotesPage');
  const tShared = useTranslations('Shared');
  const locale = useLocale();
  const pathname = usePathname(); // ✅ 2. Obtenir la ruta actual

  const allColumns = useMemo<ColumnDef<QuoteWithContact>[]>(() => [
    {
      accessorKey: 'quote_number',
      header: t('table.number'),
      enableSorting: true,
      cell: (quote) => (
        <Link
          href={`/${locale}/finances/quotes/${quote.id}`}
          className="text-green-600 hover:underline font-medium"
        >
          {quote.quote_number || `PRE-${String(quote.id).substring(0, 6)}`}
        </Link>
      ),
    },
    {
      accessorKey: 'contacts.nom',
      id: 'client_name',
      header: t('table.client'),
      enableSorting: true,
      cell: (quote) => {
        // ✅ MODIFICACIÓ: Obtenim el contacte per més claredat
        const contact = quote.contacts;

        // ✅ MODIFICACIÓ: Comprovem que el contacte i el seu ID existeixen
        if (contact && contact.id) {
          return (
            <Link
              // ✅ 3. Afegir el paràmetre ?from=... a la URL
              href={`/${locale}/crm/contactes/${contact.id}?from=${pathname}`}
              className="text-primary hover:underline font-medium"
            >
              {contact.nom}
            </Link>
          );
        }

        // Fallback si no hi ha contacte o ID
        return t('noClient', { defaultValue: 'Sense Client' });
      },
    },
    {
      accessorKey: 'issue_date',
      header: t('table.issueDate'),
      enableSorting: true,
      cell: (quote) => formatDate(quote.issue_date),
    },
    {
      accessorKey: 'total',
      header: t('table.total'),
      enableSorting: true,
      cell: (quote) => formatCurrency(quote.total ?? 0),
    },
    {
      accessorKey: 'status',
      header: t('table.status'),
      enableSorting: true,
      cell: (quote) => {
        const statusInfo = QUOTE_STATUS_MAP.find(s => s.dbValue === quote.status) || { key: 'unknown', colorClass: 'bg-gray-100 dark:bg-gray-800', textColorClass: 'text-gray-800 dark:text-gray-300' };
        return (
          <Badge
            variant="outline"
            className={cn("text-xs", statusInfo.colorClass)} // colorClass ja inclou el color de text
          >
            {t(`status.${statusInfo.key}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "actions_edit",
      header: "",
      enableSorting: false,
      cellClassName: "text-right",
      cell: (quote) => (
        // ✅ CORRECCIÓ: Unifiquem la ruta d'edició a /crm/ en lloc de /finances/
        <Link href={`/${locale}/crm/quotes/${quote.id}`} title={tShared('actions.edit')}>
          <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
        </Link>
      ),
    }
  ], [t, tShared, locale, pathname]); // ✅ 4. Afegir pathname a les dependències del useMemo
  const {
    isPending,
    data: quotes,
    itemToDelete: quoteToDelete,
    setItemToDelete: setQuoteToDelete,
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
  } = usePaginatedResource<QuoteWithContact, QuotePageFilters>({
    initialData,
    initialFilters: { status: 'all' },
    initialSort: { column: 'issue_date', order: 'desc' },
    allColumns,
    fetchAction: fetchPaginatedQuotes as (params: FetchQuotesParams) => Promise<PaginatedQuotesResponse>,
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'number') {
        const msg = tShared('errors.invalidId') + " (expected number)";
        console.error(msg, { id });
        return { success: false, message: msg };
      }
      return deleteQuoteAction(id);
    },
    initialRowsPerPage: QUOTE_ROWS_PER_PAGE_OPTIONS[0],
    rowsPerPageOptions: QUOTE_ROWS_PER_PAGE_OPTIONS,
    toastMessages: {
      deleteSuccess: t('toast.deleteSuccess'),
    }
  });

  const visibleColumns = useMemo(
    () => allColumns.filter(col => {
      const key = ('id' in col && col.id)
        ? col.id.toString()
        : col.accessorKey?.toString();
      return key ? (columnVisibility[key] ?? true) : true;
    }),
    [allColumns, columnVisibility]
  );

  const deleteDescription = (
    <>
      {tShared('deleteDialog.description1')}{' '}
      <span className="font-bold">{quoteToDelete?.quote_number || `PRE-${quoteToDelete?.id}`}</span>.
      <br />
      {tShared('deleteDialog.description2')}
    </>
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Capçalera */}
      {/* ✅ Substituïm la capçalera manual per PageHeader */}
      <PageHeader title={t('title')}>
        {/* El botó "Nova Quote" va com a 'children' */}
        <Button asChild>
          <Link href={`/${locale}/finances/quotes/new`}>
            <Plus className="w-4 h-4 mr-1" /> {t('newQuoteButton')}
          </Link>
        </Button>
      </PageHeader>

      {/* Barra de Filtres / Accions */}
      <div className="flex justify-between items-center">
        <QuotesFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
        // clients={contactsForFilter}
        />
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      <GenericDataTable<QuoteWithContact>
        className="flex-grow overflow-hidden"
        columns={visibleColumns}
        data={quotes}
        isPending={isPending}
        onSort={handleSort}
        currentSortColumn={currentSortColumn}
        currentSortOrder={currentSortOrder as 'asc' | 'desc' | null}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={QUOTE_ROWS_PER_PAGE_OPTIONS}
        deleteItem={quoteToDelete}
        setDeleteItem={setQuoteToDelete}
        onDelete={handleDelete}
        deleteTitleKey="QuotesPage.deleteDialog.title"
        deleteDescription={deleteDescription}
        emptyStateMessage={t('emptyState')}
      />
    </div>
  );
}