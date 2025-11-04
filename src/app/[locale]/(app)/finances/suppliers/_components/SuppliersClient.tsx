// /app/[locale]/(app)/finances/suppliers/_components/SuppliersClient.tsx (FITXER CORREGIT)
"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { PlusCircle, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ✅ 1. Importem ACCIONS des d'../actions
import { fetchPaginatedSuppliers, deleteSupplierAction } from '../actions';
// ✅ 2. Importem TIPUS des del SERVEI
import type { Supplier, SupplierPageFilters } from '@/lib/services/finances/suppliers/suppliers.service';
// Importem tipus genèrics que ja teníem
import { type ActionResult } from '@/types/shared/actionResult';
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource';

// Components Compartits
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { SuppliersFilters } from './SuppliersFilters';
import { formatDate } from '@/lib/utils/formatters';

// Alias i Constants
type PaginatedSuppliersResponse = PaginatedResponse<Supplier>;
type FetchSuppliersParams = PaginatedActionParams<SupplierPageFilters>;
const SUPPLIER_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

// Props del Component
interface SuppliersClientProps {
  initialData: PaginatedSuppliersResponse;
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
      enableSorting: false,
      cell: (supplier) => supplier.telefon || '-',
    },
    {
      accessorKey: 'created_at',
      header: t('table.created'),
      enableSorting: true,
      cell: (supplier) => formatDate(supplier.created_at ?? ""),
    },
    {
      accessorKey: "actions_edit",
      header: "",
      enableSorting: false,
      cellClassName: "text-right",
      cell: (supplier) => (
        <Link href={`/${locale}/finances/suppliers/${supplier.id}`} title={tShared('actions.edit')}>
          <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button>
        </Link>
      ),
    }
  ], [t, tShared, locale]);

  // --- Hook Genèric ---
  const {
    isPending,
    data: suppliers,
    itemToDelete: supplierToDelete,
    setItemToDelete: setSupplierToDelete,
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
  } = usePaginatedResource<Supplier, SupplierPageFilters>({
    initialData,
    initialFilters: {}, // ✅ Tipus correcte
    initialSort: { column: 'nom', order: 'asc' },
    allColumns,
    fetchAction: fetchPaginatedSuppliers as (params: FetchSuppliersParams) => Promise<PaginatedSuppliersResponse>,
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'string') {
        const msg = tShared('errors.invalidId') + " (expected string UUID)";
        console.error(msg, { id });
        return { success: false, message: msg };
      }
      return deleteSupplierAction(id);
    },
    initialRowsPerPage: SUPPLIER_ROWS_PER_PAGE_OPTIONS[0],
    rowsPerPageOptions: SUPPLIER_ROWS_PER_PAGE_OPTIONS,
    toastMessages: {
      deleteSuccess: t('toast.deleteSuccess'),
    }
  });

  // --- Columnes Visibles i Descripció Esborrat ---
  // --- Columnes Visibles i Descripció Esborrat ---
  const visibleColumns = useMemo(
    () => allColumns.filter(col => {
      // ✅ CORRECCIÓ: Lògica millorada per obtenir la clau de la columna.
      // Prioritzem 'id' (si existeix) i després 'accessorKey'.
      const key: string | undefined = ('id' in col && col.id)
        ? col.id.toString()
        : ('accessorKey' in col && col.accessorKey)
          ? col.accessorKey.toString()
          : undefined;

      // Si no tenim clau (columna sense id ni accessorKey), la mostrem per defecte.
      // Si tenim clau, comprovem la visibilitat.
      return key ? (columnVisibility[key] ?? true) : true;
    }),
    [allColumns, columnVisibility]
  );

  const deleteDescription = (
    <>
      {tShared('deleteDialog.description1')}{' '}
      <span className="font-bold">{supplierToDelete?.nom}</span>.
      <br />
      {tShared('deleteDialog.description2')}
    </>
  );

  // --- Renderització ---
  return (
    <div className="flex flex-col gap-4 h-full">
      <PageHeader
        title={t('title')}
      >
        <Button onClick={() => router.push(`/${locale}/finances/suppliers/new`)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('newButton')}
        </Button>
      </PageHeader>

      <div className="flex justify-between items-center">
        <SuppliersFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
        />
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      <GenericDataTable<Supplier>
        className="flex-grow overflow-hidden"
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
        deleteTitleKey="SuppliersPage.deleteDialog.title"
        deleteDescription={deleteDescription}
        emptyStateMessage={t('emptyState')}
      />
    </div>
  );
}