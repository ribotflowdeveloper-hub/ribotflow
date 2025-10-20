// src/app/[locale]/(app)/finances/invoices/_components/InvoicesClient.tsx
"use client";

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { type PaginatedInvoicesResponse, type InvoiceListRow, type InvoiceStatus } from '@/types/finances/invoices';
import { useInvoices } from '../_hooks/useInvoices';
import { useMemo } from 'react'; // Ja estava importat

// Components UI
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { InvoiceFilters } from './InvoicesFilters';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
// Podries crear InvoiceFilters.tsx similar a ExpenseFilters.tsx
// import { InvoiceFilters } from './InvoiceFilters';

interface InvoicesClientProps {
  initialData: PaginatedInvoicesResponse;
}

export function InvoicesClient({ initialData }: InvoicesClientProps) {
  const t = useTranslations('InvoicesPage');
  const tShared = useTranslations('Shared');
  const router = useRouter();

  const {
    page, pageSize, searchTerm, handleSearchChange,
    handlePageChange, handleSortChange, sortBy, sortOrder,
    deleteItem, setDeleteItem, handleDelete, isPending,
    statusFilter, handleStatusChange, // <-- Ja els tenim del hook
    columnVisibility, toggleColumnVisibility, // <-- Ja els tenim del hook
  } = useInvoices();

  const { data: invoices, count: totalCount } = initialData;
  const totalPages = Math.ceil(totalCount / pageSize);

  // ✅ Definim les columnes AMB la lògica 'cell' dins del useMemo
  const definedColumns = useMemo<ColumnDef<InvoiceListRow>[]>(() => [
    {
      accessorKey: 'invoice_number',
      header: t('table.number'),
      enableSorting: true,
      cell: (invoice) => ( // Rep InvoiceListRow directament
        <Button
          variant="link"
          className="p-0 h-auto font-medium"
          onClick={() => router.push(`/finances/invoices/${invoice.id}`)}
        >
          {invoice.invoice_number || `INV-${invoice.id}`}
        </Button>
      ),
    },
    {
      accessorKey: 'client_name', // O 'contacts.nom' si prefereixes i funciona l'ordenació
      id: 'client_name',
      header: t('table.client'),
      enableSorting: true,
      cell: (invoice) => {
        const clientDisplayName = invoice.client_name ?? invoice.contacts?.nom ?? '-';
        if (invoice.contact_id) {
          return (
            <Link href={`/crm/contactes/${invoice.contact_id}`} className="text-blue-600 hover:underline">
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
      // ✅ CORRECCIÓ: Gestionem el valor null abans de formatar
      cell: (invoice) => invoice.due_date ? formatDate(invoice.due_date) : '-',
    },
    {
      accessorKey: 'total_amount',
      header: t('table.total'),
      enableSorting: true,
      cell: (invoice) => <div className="text-right font-medium">{formatCurrency(invoice.total_amount)}</div>,
      meta: { className: 'text-right font-medium' } // opcional segons GenericDataTable

    },
    {
      accessorKey: 'status',
      header: t('table.status'),
      enableSorting: true,
      cell: (invoice) => (
        <StatusBadge status={invoice.status as InvoiceStatus} />
      ),
    },
  ], [t, router]); // Eliminem tShared si no s'usa a les columnes

  // Filtrem les columnes visibles
  const visibleColumns = useMemo(
    () => definedColumns.filter((col) => {
      // Obtenim la clau d'accés o l'ID
      const key =
        (col as ColumnDef<InvoiceListRow>).accessorKey?.toString() ??
        (col as ColumnDef<InvoiceListRow> & { id?: string }).id?.toString();
      // Permetem que columnes sense clau (com accions) siguin visibles per defecte
      return key ? (columnVisibility[key] ?? true) : true;
    }),
    [definedColumns, columnVisibility]
  );

  const deleteDescription = (
    <>
      {tShared('deleteDialog.description1')}{' '}
      <span className="font-bold">{deleteItem?.invoice_number || `INV-${deleteItem?.id}`}</span>.
      <br />
      {tShared('deleteDialog.description2')}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('title')} description={t('description')}>
        <Button onClick={() => router.push('/finances/invoices/new')}>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('newButton')}
        </Button>
      </PageHeader>

      {/* Barra de Filtres / Accions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* ✅ Utilitzem InvoiceFilters */}
        <InvoiceFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          status={statusFilter}
          onStatusChange={handleStatusChange}
        // Passa clients si tens filtre per client
        // clientId={clientFilter}
        // onClientChange={handleClientChange}
        // clients={clientsData}
        />
        {/* Botó per mostrar/ocultar columnes */}
        <ColumnToggleButton
          allColumns={definedColumns} // Use definedColumns to match expected type
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      <GenericDataTable<InvoiceListRow>
        columns={visibleColumns}
        data={invoices}
        isPending={isPending}
        onSort={handleSortChange}
        currentSortColumn={sortBy}
        currentSortOrder={sortOrder as 'asc' | 'desc' | null}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        deleteItem={deleteItem}
        setDeleteItem={setDeleteItem}
        onDelete={handleDelete}
        deleteTitleKey="InvoicesPage.deleteDialog.title"
        deleteDescription={deleteDescription}
        emptyStateMessage={t('emptyState')}
      />
    </div>
  );
}