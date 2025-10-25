// src/app/[locale]/(app)/finances/suppliers/_components/SuppliersClient.tsx
"use client";

import { useMemo } from 'react';
import Link from 'next/link'; // Afegit per si vols fer el nom clicable
import { useTranslations, useLocale } from 'next-intl';
import { PlusCircle, Edit } from 'lucide-react'; // Afegit Edit
import { useRouter } from 'next/navigation';

// Tipus i Accions
import { type Supplier } from '@/types/finances/suppliers';
import { type ActionResult } from '@/types/shared/actionResult';
import { fetchPaginatedSuppliers, deleteSupplierAction, type SupplierPageFilters } from '../actions'; // Accions refactoritzades

// Components Compartits
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';

// Components Específics
import { SuppliersFilters } from './SuppliersFilters'; // Nou component de filtres

// Hook Genèric
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource'; // <-- Corregit 'usePaginateResource' a 'usePaginatedResource'

// Utilitats
import { formatDate } from '@/lib/utils/formatters';

// Alias i Constants
type PaginatedSuppliersResponse = PaginatedResponse<Supplier>;
type FetchSuppliersParams = PaginatedActionParams<SupplierPageFilters>;
const SUPPLIER_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

// Props del Component
interface SuppliersClientProps {
  initialData: PaginatedSuppliersResponse;
  // No necessitem categories aquí per ara
}

export function SuppliersClient({ initialData }: SuppliersClientProps) {
  const t = useTranslations('SuppliersPage');
  const tShared = useTranslations('Shared');
  const router = useRouter();
  const locale = useLocale();

  // --- Definició de Columnes ---
  const allColumns = useMemo<ColumnDef<Supplier>[]>(() => [
    {
      accessorKey: 'nom',
      header: t('table.name'),
      enableSorting: true,
      cell: (supplier) => (
        <Link
          href={`/${locale}/finances/suppliers/${supplier.id}`}
          className="font-medium cursor-pointer text-primary hover:underline"
        >
          <div className="flex flex-col">
            <span>{supplier.nom}</span>
            {supplier.nif && <span className="text-muted-foreground text-xs">{supplier.nif}</span>}
          </div>
        </Link>
      ),
    },
    {
      accessorKey: 'email',
      header: t('table.email'),
      enableSorting: true,
      cell: (supplier) => supplier.email || '-',
    },
    {
      accessorKey: 'telefon',
      header: t('table.phone'),
      enableSorting: false, // Probablement no cal ordenar
      cell: (supplier) => supplier.telefon || '-',
    },
    {
      accessorKey: 'created_at',
      header: t('table.created'),
      enableSorting: true,
      cell: (supplier) => formatDate(supplier.created_at),
    },
    // Accions (Edit/Delete) - Afegim botó Edit
    {
      accessorKey: "actions_edit",
      header: "", // Capçalera Accions
      enableSorting: false,
      cellClassName: "text-right",
      cell: (supplier) => (
        <Link href={`/${locale}/finances/suppliers/${supplier.id}`} title={tShared('actions.edit')}>
          <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
        </Link>
      ),
    }
  ], [t, tShared, locale]); // <-- Eliminat 'router'
  // --- Hook Genèric ---
  const {
    isPending,
    data: suppliers,
    itemToDelete: supplierToDelete, // Renombrem
    setItemToDelete: setSupplierToDelete, // Renombrem
    handleDelete,
    handleSort,
    currentSortColumn,
    currentSortOrder,
    searchTerm,
    handleSearchChange,

    columnVisibility,
    toggleColumnVisibility,
    page,
    totalPages,
    handlePageChange,
    rowsPerPage,
    handleRowsPerPageChange,
  } = usePaginatedResource<Supplier, SupplierPageFilters>({ // <-- Tipus Supplier i SupplierPageFilters
    initialData,
    initialFilters: {}, // Filtres inicials buits
    initialSort: { column: 'nom', order: 'asc' }, // Ordenació inicial
    allColumns,
    fetchAction: fetchPaginatedSuppliers as (params: FetchSuppliersParams) => Promise<PaginatedSuppliersResponse>,
    // Adaptador per a deleteAction (Supplier ID és string/UUID)
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'string') { // Comprovem que sigui string
        const msg = tShared('errors.invalidId') + " (expected string UUID)";
        console.error(msg, { id });
        return { success: false, message: msg };
      }
      return deleteSupplierAction(id); // Funció d'eliminació real
    },
    initialRowsPerPage: SUPPLIER_ROWS_PER_PAGE_OPTIONS[0],
    rowsPerPageOptions: SUPPLIER_ROWS_PER_PAGE_OPTIONS,
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
      <span className="font-bold">{supplierToDelete?.nom}</span>.
      <br />
      {/* Pots afegir una descripció específica si vols */}
      {tShared('deleteDialog.description2')}
    </>
  );

  // --- Renderització ---
  return (
    <div className="flex flex-col gap-4 h-full"> {/* Ajustat gap i h-full */}
      <PageHeader
        title={t('title')}
        
      >
        <Button onClick={() => router.push(`/${locale}/finances/suppliers/new`)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('newButton')}
        </Button>
      </PageHeader>

      {/* Barra de Filtres / Accions */}
      <div className="flex justify-between items-center">
        <SuppliersFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          // categories={[]} // No hi ha categories
        />
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      {/* Taula Genèrica */}
      <GenericDataTable<Supplier>
        className="flex-grow overflow-hidden" // Ocupa espai restant
        columns={visibleColumns}
        data={suppliers}
        isPending={isPending}
        onSort={handleSort}
        currentSortColumn={currentSortColumn}
        currentSortOrder={currentSortOrder as 'asc' | 'desc' | null}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={SUPPLIER_ROWS_PER_PAGE_OPTIONS}
        deleteItem={supplierToDelete}
        setDeleteItem={setSupplierToDelete}
        onDelete={handleDelete}
        deleteTitleKey="SuppliersPage.deleteDialog.title" // Clau específica o genèrica
        deleteDescription={deleteDescription}
        emptyStateMessage={t('emptyState')}
      />
    </div>
  );
}