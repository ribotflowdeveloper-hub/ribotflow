"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Edit, Lock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';

import { fetchPaginatedQuotes, deleteQuoteAction } from '../actions';
import { type QuoteWithContact, type QuotePageFilters } from '@/types/finances/quotes';
import { type ActionResult } from '@/types/shared/actionResult';
import { usePathname } from 'next/navigation';

// Imports de UI
import { Button } from '@/components/ui/button';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { QuotesFilters } from './QuotesFilters';
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';
import { QUOTE_STATUS_MAP } from '@/config/styles/quotes';
import { type UsageCheckResult } from '@/lib/subscription/subscription';
// 💡 3. Importem el botó i accions d'Excel
import ExcelDropdownButton from '@/components/features/excel/ExcelDropdownButton';
import { useExcelActions } from '@/components/features/excel/useExelActions';


// Tipus i Constants
type PaginatedQuotesResponse = PaginatedResponse<QuoteWithContact>;
type FetchQuotesParams = PaginatedActionParams<QuotePageFilters>;
const QUOTE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

interface QuotesClientProps {
  initialData: PaginatedQuotesResponse;
  limitStatus: UsageCheckResult;
}

export function QuotesClient({ initialData, limitStatus }: QuotesClientProps) {
  const t = useTranslations('QuotesPage');
  const tShared = useTranslations('Shared');
  const t_billing = useTranslations('Billing');
  const locale = useLocale();
  const pathname = usePathname();

  // Calculem si s'ha assolit el límit
  const isLimitReached = !limitStatus.allowed;
  // 💡 2. TOTA LA LÒGICA D'EXCEL ARA ESTÀ AQUÍ
  const {
    isPending: isExcelPending, // Renombrem per claredat
    excelOptions,
    handleExcelAction
  } = useExcelActions({
    tableName: 'quotes',
    limitStatus: limitStatus, // Passem l'objecte de límit
    translationKeys: {
      create: 'quotes.create',
      load: 'quotes.load',
      download: 'quotes.download',
      limit: 'quotes', // Clau de Shared.limits
    }
  });
  // ... (useMemo per a 'allColumns' no canvia) ...
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
        const contact = quote.contacts;
        if (contact && contact.id) {
          return (
            <Link
              href={`/${locale}/crm/contactes/${contact.id}?from=${pathname}`}
              className="text-primary hover:underline font-medium"
            >
              {contact.nom}
            </Link>
          );
        }
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
      cell: (quote) => formatCurrency(quote.total_amount ?? 0),
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
            className={cn("text-xs", statusInfo.colorClass)}
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
        <Link href={`/${locale}/finances/quotes/${quote.id}`} title={tShared('actions.edit')}>
          <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
        </Link>
      ),
    }
  ], [t, tShared, locale, pathname]);

  // ... (hook 'usePaginatedResource' no canvia) ...
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
      <PageHeader title={t('title')}>

        {/* ✅✅✅ INICI DE LA CORRECCIÓ ✅✅✅ */}
        {/* Canviem l'estructura: <Button asChild> amb <Link> a dins,
            per <Link> amb <Button> a dins, i controlem el clic. */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* 1. L'Span és pel Tooltip. El tabIndex és per accessibilitat. */}
              <span tabIndex={isLimitReached ? 0 : -1}>
                {/* Excel Dropdown */}
                <ExcelDropdownButton
                  options={excelOptions}
                  onSelect={handleExcelAction}
                  disabled={isExcelPending}
                />
                {/* 2. El Link ara envolta el botó. */}
                <Link
                  href={!isLimitReached ? `/${locale}/finances/quotes/new` : '#'}
                  aria-disabled={isLimitReached}
                  tabIndex={isLimitReached ? -1 : undefined} // Evitem la navegació amb teclat si està desactivat
                  onClick={(e) => {
                    // 3. Prevenim el clic si el límit està assolit
                    if (isLimitReached) e.preventDefault();
                  }}
                  style={isLimitReached ? { pointerEvents: 'none' } : {}} // Doble seguretat
                >

                  {/* 4. El Botó ara només es preocupa de l'estat 'disabled' visual */}
                  <Button disabled={isLimitReached || isExcelPending} className="ml-2 flex-shrink-0">
                    {isLimitReached ? (
                      <Lock className="w-4 h-4 mr-1" />
                    ) : (
                      <Plus className="w-4 h-4 mr-1" />
                    )}
                    {t('newQuoteButton')}
                  </Button>
                </Link>
              </span>
            </TooltipTrigger>

            {/* El contingut del Tooltip (el missatge d'error) és el mateix i està bé */}
            {isLimitReached && (
              <TooltipContent className="max-w-xs p-3 shadow-lg rounded-lg border-2 border-yellow-400 bg-yellow-50">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-yellow-900" />
                    <h3 className="font-semibold">{t_billing('limitReachedTitle')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {limitStatus.error || t_billing('limitReachedDefault')}
                  </p>
                  <Button asChild size="sm" className="mt-1 w-full">
                    <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                  </Button>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {/* ✅✅✅ FI DE LA CORRECCIÓ ✅✅✅ */}

      </PageHeader>

      {/* ... (Filtres i ColumnToggleButton - no canvien) ... */}
      <div className="flex justify-between items-center">
        <QuotesFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      {/* ... (GenericDataTable - no canvia) ... */}
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