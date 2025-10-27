// src/app/[locale]/(app)/finances/invoices/_components/InvoicesClient.tsx
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Mantenim router si s'usa en columnes
import { useLocale, useTranslations } from 'next-intl';
import { PlusCircle, Edit } from 'lucide-react'; // Importem Edit per a l'acció
import { usePathname } from 'next/navigation'; // ✅ 1. Importar usePathname

// Tipus i Accions
import { type InvoiceListRow, type InvoiceStatus } from '@/types/finances/invoices';
import { type ActionResult } from '@/types/shared/actionResult';
import { fetchPaginatedInvoices, type InvoicePageFilters } from '../actions';
// ❗ IMPORTANT: Importa deleteInvoiceAction des del seu lloc correcte!
import { deleteInvoiceAction } from '../[invoiceId]/actions'; // Ajusta la ruta si cal

// Components Compartits
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { StatusBadge } from '@/components/shared/StatusBadge'; // Badge per a estats

// Components Específics
import { InvoiceFilters } from './InvoicesFilters'; // El nostre nou component

// Hook Genèric
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource'; // <-- Corregit 'usePaginateResource' a 'usePaginatedResource'
// Utilitats
import { formatDate, formatCurrency } from '@/lib/utils/formatters';

// Alias per claredat
type PaginatedInvoicesResponse = PaginatedResponse<InvoiceListRow>;
type FetchInvoicesParams = PaginatedActionParams<InvoicePageFilters>;

// Opcions de files per pàgina
const INVOICE_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

// Interfície de Props (Opcional: afegim clients per filtrar)
interface InvoicesClientProps {
  initialData: PaginatedInvoicesResponse;
  clientsForFilter?: { id: number; nom: string | null }[]; // Llista de clients
}

export function InvoicesClient({ initialData, clientsForFilter = [] }: InvoicesClientProps) {
  const t = useTranslations('InvoicesPage');
  const tShared = useTranslations('Shared');
  const router = useRouter(); // Per al botó 'Nova' i potser columnes
  const locale = useLocale(); // Per a enllaços
  const pathname = usePathname(); // ✅ 2. Obtenir la ruta actual 
  // --- Definició de Columnes ---
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
      // Usem 'client_name' que ve del RPC per ordenar
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
    // Afegim columna d'acció EDITAR explícita
    {
      accessorKey: "actions_edit",
      header: "", // Sense text
      enableSorting: false,
      cell: (invoice) => (
        <Link href={`/${locale}/finances/invoices/${invoice.id}`} title={tShared('actions.edit')}>
          <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
        </Link>
      ),
    }
  ], [t, locale, tShared, pathname]); // Afegim locale, tShared i pathname si s'usen

  // --- Hook Genèric ---
  const {
    isPending,
    data: invoices, // Renombrem
    itemToDelete: invoiceToDelete, // Renombrem
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
    initialFilters: { status: 'all', contactId: 'all' }, // Filtres inicials
    initialSort: { column: 'issue_date', order: 'desc' }, // Ordenació inicial
    allColumns,
    fetchAction: fetchPaginatedInvoices as (params: FetchInvoicesParams) => Promise<PaginatedInvoicesResponse>,
    deleteAction: async (id: string | number): Promise<ActionResult> => { // Adaptador
      if (typeof id !== 'number') {
        const msg = tShared('errors.invalidId');
        console.error(msg, { id });
        return { success: false, message: msg };
      }
      return deleteInvoiceAction(id); // Funció d'eliminació real
    },
    initialRowsPerPage: INVOICE_ROWS_PER_PAGE_OPTIONS[0],
    rowsPerPageOptions: INVOICE_ROWS_PER_PAGE_OPTIONS,
    toastMessages: {
      deleteSuccess: t('toast.deleteSuccess'), // Assegura't que existeix
    }
  });

  // --- Columnes Visibles i Descripció Esborrat ---
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

  // --- Renderització ---
  return (
    <div className="flex flex-col gap-4 h-full"> {/* Ajustat gap i h-full */}
      <PageHeader title={t('title')}>
        <Button onClick={() => router.push(`/${locale}/finances/invoices/new`)}>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('newButton')}
        </Button>
      </PageHeader>

      {/* Barra de Filtres / Accions */}
      <div className="flex justify-between items-center">
        {/* La crida aquí ja està preparada per a la versió corregida de InvoiceFilters */}
        <InvoiceFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters} // <-- Passa l'objecte de filtres
          onFilterChange={handleFilterChange} // <-- Passa el gestor genèric
          clients={clientsForFilter}
        />
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      {/* Taula Genèrica */}
      <GenericDataTable<InvoiceListRow>
        className="flex-grow overflow-hidden" // Ocupa espai restant
        columns={visibleColumns}
        data={invoices}
        isPending={isPending}
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
        // Assegura't que aquesta clau existeix, sinó usa una de Shared
        deleteTitleKey="InvoicesPage.deleteDialog.title"
        deleteDescription={deleteDescription}
        emptyStateMessage={t('emptyState')}
      />
    </div>
  );
}