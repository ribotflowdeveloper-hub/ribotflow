"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { PlusCircle, Edit, TriangleAlert } from 'lucide-react';
import { usePathname } from 'next/navigation';

// Tipus i Accions
import { type InvoiceListRow, type InvoiceStatus } from '@/types/finances/invoices';
import { type ActionResult } from '@/types/shared/actionResult';
import { fetchPaginatedInvoices, type InvoicePageFilters } from '../actions';
import { deleteInvoiceAction } from '../[invoiceId]/actions';

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

// Components Específics
import { InvoiceFilters } from './InvoicesFilters';

// Hook Genèric
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource';
// Utilitats
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { type UsageCheckResult } from '@/lib/subscription/subscription';
// 💡 3. Importem el botó i accions d'Excel
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

export function InvoicesClient({
  initialData,
  clientsForFilter = [],
  invoiceLimitStatus
}: InvoicesClientProps) {

  const t = useTranslations('InvoicesPage');
  const tShared = useTranslations('Shared');
  const t_billing = useTranslations('Shared.limits');
  const router = useRouter();
  const locale = useLocale();
  const pathname = usePathname();
  // 💡 2. TOTA LA LÒGICA D'EXCEL ARA ESTÀ AQUÍ
  const {
    isPending: isExcelPending, // Renombrem per claredat
    excelOptions,
    handleExcelAction
  } = useExcelActions({
    tableName: 'invoices',
    limitStatus: invoiceLimitStatus,
    translationKeys: {
      create: 'invoices.create',
      load: 'invoices.load',
      download: 'invoices.download',
      limit: 'invoices', // Clau de Shared.limits
    }
  });
  const [showLimitModal, setShowLimitModal] = useState(false);

  // --- Definició de Columnes (No canvia) ---
  const allColumns = useMemo<ColumnDef<InvoiceListRow>[]>(() => [
    // ... (les teves columnes) ...
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

  // --- Hook Genèric (No canvia) ---
  const {
    isPending: isTablePending, // Renombrem per claredat
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
    // ... (configuració del hook sense canvis)
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

  // --- Columnes Visibles i Descripció Esborrat (No canvien) ---
  const visibleColumns = useMemo(
    () => allColumns.filter(col => columnVisibility[col.accessorKey.toString()] ?? true),
    [allColumns, columnVisibility]
  );
  const deleteDescription = (
    <>
      {tShared('deleteDialog.description1')}{' '}
      <span className="font-bold">{invoiceToDelete?.invoice_number || `INV-${invoiceToDelete?.id}`}</span>.
      <br />
      {tShared('deleteDialog.description2')}
    </>
  );

  // Variable per mostrar l'alerta
  const isLimitExceeded = invoiceLimitStatus && !invoiceLimitStatus.allowed;

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

      {/* ✅ AQUEST ÉS EL CANVI PRINCIPAL */}
      <PageHeader title={t('title')}>

        {/* 1. L'Alerta ara és un fill del PageHeader */}
        {isLimitExceeded && (
          <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900 p-2 max-w-md">
            <TriangleAlert className="h-4 w-4 text-yellow-900" />
            <AlertTitle className="font-semibold text-xs mb-0"> {/* Més compacte */}
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
        {/* 💡 5. Botó d'Excel afegit i connectat al hook */}
        <ExcelDropdownButton
          options={excelOptions}
          onSelect={handleExcelAction}
          disabled={isExcelPending || isTablePending}
        />
        {/* 2. El Botó ara és un "germà" de l'Alerta */}
        <Button onClick={handleNewInvoiceClick}>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('newButton')}
        </Button>

      </PageHeader>

      {/* ❗ Eliminem l'Alert que hi havia aquí abans */}

      {/* Barra de Filtres / Accions (sense canvis) */}
      <div className="flex justify-between items-center">
        {/* ... (InvoiceFilters i ColumnToggleButton) ... */}
        <InvoiceFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          clients={clientsForFilter}
        />
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      {/* Taula Genèrica (sense canvis) */}
      <GenericDataTable<InvoiceListRow>
        // ... (props de la taula)
        className="flex-grow overflow-hidden"
        columns={visibleColumns}
        data={invoices}
        isPending={isExcelPending || isTablePending} // 💡 6. Combinem els 'pending'        
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
        onDelete={handleDelete}
        deleteTitleKey="InvoicesPage.deleteDialog.title"
        deleteDescription={deleteDescription}
        emptyStateMessage={t('emptyState')}
      />

      {/* Modal d'avís de límit (sense canvis) */}
      <AlertDialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        {/* ... (contingut del modal) ... */}
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