// src/app/[locale]/(app)/crm/quotes/_components/QuotesClient.tsx
"use client";

import { useMemo, useEffect} from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Edit, Lock, CheckSquare, Square, Trash2, Loader2 } from 'lucide-react'; // 🆕 Noves icones
import { PageHeader } from '@/components/shared/PageHeader';
import { usePathname } from 'next/navigation'; // Importem useRouter i usePathname

import { fetchPaginatedQuotes, deleteQuoteAction, deleteBulkQuotesAction } from '../actions'; // 🆕 Importem deleteBulkQuotesAction
import { type QuoteWithContact, type QuotePageFilters } from '@/types/finances/quotes';
import { type ActionResult } from '@/types/shared/actionResult';

// Imports de UI
import { Button } from '@/components/ui/button';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { QuotesFilters } from './QuotesFilters';

// Hooks i Utilitats
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource';
import { useMultiSelect } from '@/hooks/useMultiSelect'; // 🌟 NOU HOOK
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';
import { QUOTE_STATUS_MAP } from '@/config/styles/quotes';
import { type UsageCheckResult } from '@/lib/subscription/subscription';
import ExcelDropdownButton from '@/components/features/excel/ExcelDropdownButton';
import { useExcelActions } from '@/components/features/excel/useExelActions';


// Tipus i Constants
type PaginatedQuotesResponse = PaginatedResponse<QuoteWithContact>;
type FetchQuotesParams = PaginatedActionParams<QuotePageFilters>;
const QUOTE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

// 🌟 OBJECTE DUMMY PER SENYALITZAR ELIMINACIÓ MASIVA
// Ha de complir amb les propietats mínimes de QuoteWithContact
const BULK_DELETE_ITEM: QuoteWithContact & { isBulk: true } = {
  id: -1,
  quote_number: 'BULK_DELETE',
  issue_date: new Date().toISOString(),
  total_amount: 0,
  status: 'Draft',
  contacts: null,
  isBulk: true
} as QuoteWithContact & { isBulk: true };

interface QuotesClientProps {
  initialData: PaginatedQuotesResponse;
  limitStatus: UsageCheckResult;
}

export function QuotesClient({ initialData, limitStatus }: QuotesClientProps) {
  const t = useTranslations('QuotesPage');
  const tShared = useTranslations('Shared');
  const tActions = useTranslations('Shared.actions');
  const t_billing = useTranslations('Billing'); // Billing es la clau del fitxer de missatges, no Shared.limits
  const locale = useLocale();
  const pathname = usePathname();

  // Calculem si s'ha assolit el límit
  const isLimitReached = !limitStatus.allowed;

  const {
    isPending: isExcelPending,
    excelOptions,
    handleExcelAction
  } = useExcelActions({
    tableName: 'quotes',
    limitStatus: limitStatus,
    translationKeys: {
      create: 'quotes.create', load: 'quotes.load', download: 'quotes.download', limit: 'maxQuotesPerMonth',
    }
  });

  // --- Column Definitions (Sense canvis) ---
  const allColumns = useMemo<ColumnDef<QuoteWithContact>[]>(() => [
    { accessorKey: 'quote_number', header: t('table.number'), enableSorting: true, cell: (quote) => (<Link href={`/${locale}/finances/quotes/${quote.id}`} className="text-green-600 hover:underline font-medium"> {quote.quote_number || `PRE-${String(quote.id).substring(0, 6)}`} </Link>), },
    { accessorKey: 'contacts.nom', id: 'client_name', header: t('table.client'), enableSorting: true, cell: (quote) => { const contact = quote.contacts; if (contact && contact.id) { return (<Link href={`/${locale}/crm/contactes/${contact.id}?from=${pathname}`} className="text-primary hover:underline font-medium"> {contact.nom} </Link>); } return t('noClient', { defaultValue: 'Sense Client' }); }, },
    { accessorKey: 'issue_date', header: t('table.issueDate'), enableSorting: true, cell: (quote) => formatDate(quote.issue_date), },
    { accessorKey: 'total', header: t('table.total'), enableSorting: true, cell: (quote) => formatCurrency(quote.total_amount ?? 0), },
    { accessorKey: 'status', header: t('table.status'), enableSorting: true, cell: (quote) => { const statusInfo = QUOTE_STATUS_MAP.find(s => s.dbValue === quote.status) || { key: 'unknown', colorClass: 'bg-gray-100 dark:bg-gray-800', textColorClass: 'text-gray-800 dark:text-gray-300' }; return (<Badge variant="outline" className={cn("text-xs", statusInfo.colorClass)}> {t(`status.${statusInfo.key}`)} </Badge>); }, },
    { accessorKey: "actions_edit", header: "", enableSorting: false, cellClassName: "text-right", cell: (quote) => (<Link href={`/${locale}/finances/quotes/${quote.id}`} title={tShared('actions.edit')}> <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button> </Link>), }
  ], [t, tShared, locale, pathname]);

  // --- 2. Hook de Paginació (usePaginatedResource) ---
  const {
    isPending: isTablePending, data: quotes, itemToDelete: quoteToDelete, setItemToDelete: setQuoteToDelete, handleDelete,
    handleSort, currentSortColumn, currentSortOrder, searchTerm, handleSearchChange, filters, handleFilterChange,
    columnVisibility, toggleColumnVisibility, page, totalPages, handlePageChange, rowsPerPage, handleRowsPerPageChange,
  } = usePaginatedResource<QuoteWithContact, QuotePageFilters>({
    initialData, initialFilters: { status: 'all' }, initialSort: { column: 'issue_date', order: 'desc' }, allColumns,
    fetchAction: fetchPaginatedQuotes as (params: FetchQuotesParams) => Promise<PaginatedQuotesResponse>,
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'number') { const msg = tShared('errors.invalidId') + " (expected number)"; console.error(msg, { id }); return { success: false, message: msg }; }
      return deleteQuoteAction(id);
    },
    initialRowsPerPage: QUOTE_ROWS_PER_PAGE_OPTIONS[0], rowsPerPageOptions: QUOTE_ROWS_PER_PAGE_OPTIONS,
    toastMessages: { deleteSuccess: t('toast.deleteSuccess'), }
  });

  // --- 3. Hook de Selecció Múltiple (useMultiSelect) ---
  const {
    isMultiSelectActive, selectedItems, isBulkDeletePending,
    onToggleMultiSelect, onSelectAll, onSelectItem, handleBulkDelete, clearSelection,
  } = useMultiSelect<QuoteWithContact>({
    data: quotes,
    bulkDeleteAction: (ids: (string | number)[]) => {
      const numberIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      return deleteBulkQuotesAction(numberIds as number[]);
    },
    toastMessages: { bulkDeleteSuccess: t('toast.bulkDeleteSuccess'), bulkDeleteError: tShared('errors.genericDeleteError'), },
    onDeleteSuccess: () => { handleSort(currentSortColumn || 'issue_date'); },
  });

  // 🔑 Neteja la selecció quan hi ha canvis de dades o paginació
  useEffect(() => { clearSelection(); }, [page, searchTerm, filters, clearSelection]);

  // --- 4. Lògica Unificada i Presentació ---
  const isBulkDeletionMode = isMultiSelectActive && selectedItems.length > 0;
  const isBulkDeletionDialog = quoteToDelete === BULK_DELETE_ITEM;

  const deleteTitleKey = isBulkDeletionDialog ? 'Shared.deleteDialog.titleBulk' : 'QuotesPage.deleteDialog.title';

  // 🔑 CLAU: Gestor unificat (cridat pel GenericDataTable)
  const handleUnifiedDelete = () => {
    if (isBulkDeletionDialog) {
      handleBulkDelete();
    } else if (quoteToDelete) {
      handleDelete(); // Individual
    }
  };

  const visibleColumns = useMemo(
    () => allColumns.filter(col => {
      const key = col.accessorKey?.toString();
      return key ? (columnVisibility[key] ?? true) : true;
    }),
    [allColumns, columnVisibility]
  );

  const deleteDescription = useMemo(() => {
    if (isBulkDeletionDialog) {
      return tShared('deleteDialog.descriptionBulk', { count: selectedItems.length });
    }
    const quoteNumber = quoteToDelete
      ? quoteToDelete.quote_number || `PRE-${quoteToDelete.id}`
      : tShared('deleteDialog.defaultRecord');

    return (
      <>
        {tShared('deleteDialog.description1')}{' '}
        <span className="font-bold">{quoteNumber}</span>.
        <br />
        {tShared('deleteDialog.description2')}
      </>
    );
  }, [quoteToDelete, isBulkDeletionDialog, selectedItems.length, tShared]);


  return (
    <div className="flex flex-col gap-4 h-full">
      <PageHeader title={t('title')}>

        {/* 1. Botó d'Excel (Deshabilitat en mode selecció) */}
        <ExcelDropdownButton
          options={excelOptions}
          onSelect={handleExcelAction}
          disabled={isExcelPending || isTablePending || isMultiSelectActive}
        />

        {/* 2. Botó Nova Cotització (Mantenint la lògica de Tooltip/Límit) */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={isLimitReached ? 0 : -1}>
                <Link
                  href={!isLimitReached && !isMultiSelectActive ? `/${locale}/finances/quotes/new` : '#'}
                  aria-disabled={isLimitReached || isMultiSelectActive}
                  tabIndex={isLimitReached || isMultiSelectActive ? -1 : undefined}
                  onClick={(e) => {
                    if (isLimitReached || isMultiSelectActive) e.preventDefault();
                  }}
                  style={isLimitReached || isMultiSelectActive ? { pointerEvents: 'none' } : {}}
                >
                  <Button disabled={isLimitReached || isExcelPending || isTablePending || isMultiSelectActive} className="ml-2 flex-shrink-0">
                    {isLimitReached ? (<Lock className="w-4 h-4 mr-1" />) : (<Plus className="w-4 h-4 mr-1" />)}
                    {t('newQuoteButton')}
                  </Button>
                </Link>
              </span>
            </TooltipTrigger>
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

      </PageHeader>

      {/* 2. 🌟 BARRA D'ACCIÓ RÀPIDA (Toggle + Eliminar + Filtres) */}
      <div className="flex justify-between items-start gap-4">

        {/* GRUP ESQUERRA: TOGGLE + ELIMINAR MASSIU + FILTRES */}
        <div className="flex items-center gap-2 flex-grow">

          {/* 🌟 1. Botó de Toggle (Esquerra del tot) */}
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

          {/* 🌟 2. Botó d'Eliminació Massiva (Apareix només si hi ha selecció) */}
          {isBulkDeletionMode && (
            <Button
              variant="destructive" size="sm"
              // 🔑 CLAU: Quan cliquem, assignem l'objecte dummy per obrir el diàleg
              onClick={() => setQuoteToDelete(BULK_DELETE_ITEM as QuoteWithContact | null)}
              disabled={selectedItems.length === 0 || isBulkDeletePending || isTablePending || isExcelPending}
              className="flex-shrink-0"
            >
              {(isBulkDeletePending || isTablePending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Trash2 className="w-4 h-4 mr-2" />
              {tActions('deleteCount', { count: selectedItems.length })}
            </Button>
          )}

          {/* 3. Filtres (Deshabilitats si la selecció està activa) */}
          <QuotesFilters
            searchTerm={searchTerm} onSearchChange={handleSearchChange} filters={filters} onFilterChange={handleFilterChange}
          />
        </div>

        {/* GRUP DRETA: Toggle de Columnes */}
        <ColumnToggleButton allColumns={allColumns} columnVisibility={columnVisibility} toggleColumnVisibility={toggleColumnVisibility} />
      </div>

      {/* Data Table */}
      <GenericDataTable<QuoteWithContact>
        className="flex-grow overflow-hidden"
        columns={visibleColumns}
        data={quotes}
        isPending={isExcelPending || isTablePending || isBulkDeletePending}
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
        onDelete={handleUnifiedDelete} // 🔑 Crida al gestor unificat 
        // PROPS DE MULTI SELECT
        isMultiSelectActive={isMultiSelectActive} selectedItems={selectedItems} onToggleMultiSelect={onToggleMultiSelect}
        onSelectAll={onSelectAll} onSelectItem={onSelectItem} onBulkDelete={handleBulkDelete} isBulkDeletePending={isBulkDeletePending}

        deleteTitleKey={deleteTitleKey}
        deleteDescription={deleteDescription}
        emptyStateMessage={t('emptyState')}
      />
    </div>
  );
}