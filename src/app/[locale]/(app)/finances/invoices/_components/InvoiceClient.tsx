// src/app/[locale]/(app)/finances/invoices/_components/InvoicesClient.tsx
"use client";

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
// 🆕 Importem totes les icones
import { PlusCircle, Edit, TriangleAlert, CheckSquare, Square, Trash2, Loader2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

// Tipus i Accions
import { type InvoiceListRow, type InvoiceStatus } from '@/types/finances/invoices';
import { type ActionResult } from '@/types/shared/actionResult';
import { fetchPaginatedInvoices, type InvoicePageFilters } from '../actions';
// 🆕 Importem Server Actions
import { deleteInvoiceAction, deleteBulkInvoicesAction } from '../[invoiceId]/actions';

// Components Compartits
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { StatusBadge } from '@/components/shared/StatusBadge';
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
// Importem els components de l'Alert
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils/utils'; // 💡 S'afegeix un ús per evitar l'error TS/ESLint (encara que realment només s'usi al CSS del component)

// Components Específics
import { InvoiceFilters } from './InvoicesFilters';

// Hook Genèric i Hook de Selecció
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource';
import { useMultiSelect } from '@/hooks/useMultiSelect'; // 🌟 NOU HOOK
// Utilitats
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { type UsageCheckResult } from '@/lib/subscription/subscription';
// 💡 Importem i utilitzem els hooks d'Excel (SOLUCIONA ELS ERRORS 6133)
import ExcelDropdownButton from '@/components/features/excel/ExcelDropdownButton';
import { useExcelActions } from '@/components/features/excel/useExelActions';
// Alias per claredat
type PaginatedInvoicesResponse = PaginatedResponse<InvoiceListRow>;
type FetchInvoicesParams = PaginatedActionParams<InvoicePageFilters>;

// Opcions de files per pàgina
const INVOICE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

interface InvoicesClientProps {
  initialData: PaginatedInvoicesResponse;
  clientsForFilter?: { id: number; nom: string | null }[];
  invoiceLimitStatus: UsageCheckResult | null;
}
// Alias per tipus d'eliminació massiva (per a l'estat `invoiceToDelete`)
// 🔑 PER QUÈ: Usem aquest objecte dummy per indicar que l'AlertDialog s'ha d'obrir
// per eliminació massiva sense trencar els tipus de `invoiceToDelete: TData | null`.
const BULK_DELETE_ITEM: Partial<InvoiceListRow> = { id: -1, /* isBulk: true */ }; // Ha de complir TData amb 'id'

export function InvoicesClient({
  initialData,
  clientsForFilter = [],
  invoiceLimitStatus
}: InvoicesClientProps) {

  const t = useTranslations('InvoicesPage');
  const tShared = useTranslations('Shared');
  const t_billing = useTranslations('Shared.limits');
  const tActions = useTranslations('Shared.actions'); // 💡 Per a missatges d'acció
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();

  // --- Lògica d'Excel (SOLUCIONA ELS ERRORS 2304) ---
  const {
    isPending: isExcelPending,
    excelOptions,
    handleExcelAction
  } = useExcelActions({
    tableName: 'invoices',
    limitStatus: invoiceLimitStatus,
    translationKeys: {
      create: 'invoices.create',
      load: 'invoices.load',
      download: 'invoices.download',
      limit: 'invoices',
    }
  });
  // 💡 setShowLimitModal no llegeix el seu valor, però el canvia. Havia de ser `useState` normal.
  const [showLimitModal, setShowLimitModal] = useState(false); // SOLUCIONA L'ERROR 2304

  // 1. DEFINICIÓ DE COLUMNES (Incondicional)
  const allColumns = useMemo<ColumnDef<InvoiceListRow>[]>(() => [
    {
      accessorKey: 'invoice_number',
      header: t('table.number'),
      enableSorting: true,
      cell: (invoice) => (
        <Link
          href={`/${locale}/finances/invoices/${invoice.id}`}
          className="text-primary hover:underline font-medium"
        >
          {invoice.invoice_number || `INV-${invoice.id}`}
        </Link>
      ),
    },
    {
      accessorKey: 'client_name',
      header: t('table.client'),
      enableSorting: true,
      cell: (invoice) => {
        const clientDisplayName = invoice.client_name ?? invoice.contacts?.nom ?? '-';
        if (invoice.contact_id) {
          return (
            <Link
              href={`/${locale}/crm/contactes/${invoice.contact_id}?from=${pathname}`}
              className="text-primary hover:underline font-medium"
            >
              {clientDisplayName}
            </Link>
          );
        }
        return clientDisplayName;
      },
    },
    {
      accessorKey: 'issue_date',
      header: t('table.invoiceDate'),
      enableSorting: true,
      cell: (invoice) => formatDate(invoice.issue_date),
    },
    {
      accessorKey: 'due_date',
      header: t('table.dueDate'),
      enableSorting: true,
      cell: (invoice) => invoice.due_date ? formatDate(invoice.due_date) : '-',
    },
    {
      accessorKey: 'total_amount',
      header: t('table.total'),
      enableSorting: true,
      cell: (invoice) => formatCurrency(invoice.total_amount),
    },
    {
      accessorKey: 'status',
      header: t('table.status'),
      enableSorting: true,
      cell: (invoice) => (
        <StatusBadge status={invoice.status as InvoiceStatus} />
      ),
    },
    {
      accessorKey: "actions_edit",
      header: "",
      enableSorting: false,
      cell: (invoice) => (
        <Link href={`/${locale}/finances/invoices/${invoice.id}`} title={tShared('actions.edit')}>
          <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
        </Link>
      ),
    }
  ], [t, locale, tShared, pathname]);


  // --- 2. Hook de Paginació (Sense MultiSelect) ---
  const {
    isPending: isTablePending,
    data: invoices,
    itemToDelete: invoiceToDelete,
    setItemToDelete: setInvoiceToDelete,
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
  } = usePaginatedResource<InvoiceListRow, InvoicePageFilters>({
    initialData,
    initialFilters: { status: 'all', contactId: 'all' },
    initialSort: { column: 'issue_date', order: 'desc' },
    allColumns,
    fetchAction: fetchPaginatedInvoices as (params: FetchInvoicesParams) => Promise<PaginatedInvoicesResponse>,
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'number') {
        const msg = tShared('errors.invalidId');
        return { success: false, message: msg };
      }
      return deleteInvoiceAction(id);
    },
    initialRowsPerPage: INVOICE_ROWS_PER_PAGE_OPTIONS[0],
    rowsPerPageOptions: INVOICE_ROWS_PER_PAGE_OPTIONS,
    toastMessages: {
      deleteSuccess: t('toast.deleteSuccess'),
    }
  });

  const {
    isMultiSelectActive,
    selectedItems, // 👈 Aquesta variable ja no es llegeix abans de ser definida
    isBulkDeletePending,
    onToggleMultiSelect,
    onSelectAll,
    onSelectItem,
    handleBulkDelete,
    clearSelection,
  } = useMultiSelect<InvoiceListRow>({
    data: invoices,
    bulkDeleteAction: (ids: (string | number)[]) => {
      const numberIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      return deleteBulkInvoicesAction(numberIds);
    },
    toastMessages: {
      // 🚨 CORREGIT: Ja NO passem selectedItems.length. 
      // El hook useMultiSelect rebrà la clau i utilitzarà l'array 'ids' per obtenir el comptador internament.
      bulkDeleteSuccess: t('toast.bulkDeleteSuccess'),
      bulkDeleteError: tShared('errors.genericDeleteError'),
    },
    // Funció de callback: forcem un canvi d'estat per disparar el refetch en usePaginatedResource
    onDeleteSuccess: () => {
      handleSort(currentSortColumn || 'issue_date');
    },
  });

  // 🔑 PER QUÈ: Neteja la selecció quan es canvia de pàgina o filtre.
  useEffect(() => {
    clearSelection();
    // Si canviem de pàgina, cerca o filtre, netegem la selecció (l'usuari només selecciona a la pàgina actual)
  }, [page, searchTerm, filters, clearSelection]);

  // --- 4. Lògica de Presentació ---
  const visibleColumns = useMemo(
    () => allColumns.filter(col => columnVisibility[col.accessorKey.toString()] ?? true),
    [allColumns, columnVisibility]
  );

  const isLimitExceeded = invoiceLimitStatus && !invoiceLimitStatus.allowed;

  // 🔑 PER QUÈ: Gestor unificat que decideix si esborra individualment o massivament
  const handleUnifiedDelete = () => {
    // Si invoiceToDelete és l'objecte BULK_DELETE_ITEM, cridem la funció massiva.
    if (invoiceToDelete === BULK_DELETE_ITEM) {
      handleBulkDelete(); // Crida a l'eliminació massiva de useMultiSelect
      setInvoiceToDelete(null); // Tanca el diàleg
    } else if (invoiceToDelete) {
      handleDelete(); // Crida a l'eliminació individual de usePaginatedResource
    }
  };

  // 🔑 PER QUÈ: Aquesta lògica detecta si estem en mode BULK DELETE 
  // per canviar el títol del diàleg i mostrar el botó.
  const isBulkDeletionMode = isMultiSelectActive && selectedItems.length > 0;
  const isBulkDeletionDialog = invoiceToDelete === BULK_DELETE_ITEM; // Nova variable de diàleg

  const deleteTitleKey = isBulkDeletionDialog
    ? 'Shared.deleteDialog.titleBulk'
    : 'InvoicesPage.deleteDialog.title';

  const deleteDescription = useMemo(() => {
    // Usem isBulkDeletionDialog per garantir que els comptadors només es mostrin quan el diàleg s'obre
    if (isBulkDeletionDialog) {
      return tShared('deleteDialog.descriptionBulk', { count: selectedItems.length });
    }
    return (
      <>
        {tShared('deleteDialog.description1')}{' '}
        <span className="font-bold">{invoiceToDelete?.invoice_number || `INV-${invoiceToDelete?.id}`}</span>.
        <br />
        {tShared('deleteDialog.description2')}
      </>
    );
  }, [invoiceToDelete, isBulkDeletionDialog, selectedItems.length, tShared]);


  // Gestor pel botó "Nova Factura"
  const handleNewInvoiceClick = () => {
    if (isLimitExceeded) {
      setShowLimitModal(true);
    } else {
      router.push(`/${locale}/finances/invoices/new`);
    }
  };


  // --- Renderització ---
  return (
    <div className="flex flex-col gap-4 h-full">

      {/* 1. PAGE HEADER (Accions principals: Nova, Excel) */}
      <PageHeader title={t('title')}>

        {isLimitExceeded && (
          <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900 p-2 max-w-md">
            <TriangleAlert className="h-4 w-4 text-yellow-900" />
            <AlertTitle className="font-semibold text-xs mb-0">
              {t_billing('modalTitle', { default: 'Límit assolit' })}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {invoiceLimitStatus.error || t_billing('invoicesPerMonth', { current: invoiceLimitStatus.current, max: invoiceLimitStatus.max })}
              <Button asChild variant="link" size="sm" className="p-0 h-auto ml-1 text-yellow-900 font-semibold underline">
                <Link href={`/${locale}/settings/billing`}>{t_billing('upgradeButton')}</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Botó Excel (Deshabilitat en mode selecció) */}
        <ExcelDropdownButton
          options={excelOptions}
          onSelect={handleExcelAction}
          disabled={isExcelPending || isTablePending || isMultiSelectActive}
        />

        {/* Botó de Nova Factura (Deshabilitat en mode selecció) */}
        <Button onClick={handleNewInvoiceClick} disabled={isTablePending || isExcelPending || isMultiSelectActive}>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('newButton')}
        </Button>
      </PageHeader>

      {/* 2. 🌟 BARRA D'ACCIÓ RÀPIDA (Toggle + Filtres + Botó Eliminar Massiu) */}
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
          {isBulkDeletionMode && ( // Usem isBulkDeletionMode aquí
            <Button
              variant="destructive"
              size="sm"
              // 🔑 CLAU: Quan cliquem, assignem l'objecte dummy per obrir el diàleg
              onClick={() => setInvoiceToDelete(BULK_DELETE_ITEM as InvoiceListRow | null)}
              // Deshabilitat si no hi ha ítems per eliminar
              disabled={selectedItems.length === 0 || isBulkDeletePending || isTablePending || isExcelPending}
              className="flex-shrink-0"
            >
              {(isBulkDeletePending || isTablePending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Trash2 className="w-4 h-4 mr-2" />
              {tActions('deleteCount', { count: selectedItems.length })}
            </Button>
          )}

          {/* 3. Filtres (Deshabilitats si la selecció està activa) */}
          <InvoiceFilters
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            filters={filters}
            onFilterChange={handleFilterChange}
            clients={clientsForFilter}
          />
        </div>

        {/* GRUP DRETA: Toggle de Columnes */}
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      {/* 3. TAULA DE DADES */}
      <GenericDataTable<InvoiceListRow>
        className="flex-grow overflow-hidden"
        columns={visibleColumns}
        data={invoices}
        isPending={isExcelPending || isTablePending || isBulkDeletePending}
        onSort={handleSort}
        currentSortColumn={currentSortColumn}
        currentSortOrder={currentSortOrder as 'asc' | 'desc' | null}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={INVOICE_ROWS_PER_PAGE_OPTIONS}

        deleteItem={invoiceToDelete}
        setDeleteItem={setInvoiceToDelete}
        // 🔑 CLAU: La taula crida a handleUnifiedDelete (el nostre gestor)
        onDelete={handleUnifiedDelete}

        // 🌟 PROPS DE SELECCIÓ MÚLTIPLE
        isMultiSelectActive={isMultiSelectActive}
        selectedItems={selectedItems}
        onToggleMultiSelect={onToggleMultiSelect}
        onSelectAll={onSelectAll}
        onSelectItem={onSelectItem}
        onBulkDelete={handleBulkDelete} // No s'utilitza directament, però es passa
        isBulkDeletePending={isBulkDeletePending}

        deleteTitleKey={deleteTitleKey}
        deleteDescription={deleteDescription}
        emptyStateMessage={t('emptyState')}
      />

      {/* Modal d'avís de límit (sense canvis, utilitza setShowLimitModal) */}
      <AlertDialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="text-destructive" />
              {t_billing('modalTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t_billing('invoicesPerMonth', {
                current: invoiceLimitStatus?.current ?? 0,
                max: invoiceLimitStatus?.max ?? 0
              })}
              <br />
              {t_billing('upgradePlan')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Button variant="outline" onClick={() => setShowLimitModal(false)}>{tShared('actions.cancel')}</Button>
            </AlertDialogCancel>
            <AlertDialogAction>
              <Link href={`/${locale}/settings/billing`} passHref>
                <Button>{t_billing('upgradeButton')}</Button>
              </Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}