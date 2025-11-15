"use client";

// ✅ 1. Importem 'useState' i components necessaris
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { PlusCircle, Edit, TriangleAlert } from 'lucide-react'; // ✅ Importem 'TriangleAlert'
import { useRouter } from 'next/navigation';

// Accions i Tipus
import { fetchPaginatedSuppliers, deleteSupplierAction } from '../actions';
import type { Supplier, SupplierPageFilters } from '@/lib/services/finances/suppliers/suppliers.service';
import { type ActionResult } from '@/types/shared/actionResult';
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource';
import { type UsageCheckResult } from '@/lib/subscription/subscription'; // ✅ Importem tipus de límit

// Components Compartits
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { SuppliersFilters } from './SuppliersFilters';
import { formatDate } from '@/lib/utils/formatters';
// ✅ 2. Importem els components d'Alerta i Modal
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// 💡 3. Importem el botó i accions d'Excel
import ExcelDropdownButton from '@/components/features/excel/ExcelDropdownButton';
import { useExcelActions } from '@/components/features/excel/useExelActions';
// Alias i Constants
type PaginatedSuppliersResponse = PaginatedResponse<Supplier>;
type FetchSuppliersParams = PaginatedActionParams<SupplierPageFilters>;
const SUPPLIER_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

// ✅ 3. Actualitzem les Props
interface SuppliersClientProps {
  initialData: PaginatedSuppliersResponse;
  supplierLimitStatus: UsageCheckResult | null; // <-- NOVA PROP
}

export function SuppliersClient({
  initialData,
  supplierLimitStatus // ✅ 4. Rebem la prop
}: SuppliersClientProps) {
  const t = useTranslations('SuppliersPage');
  const tShared = useTranslations('Shared');
  const t_billing = useTranslations('Shared.limits'); // Per als missatges
  const router = useRouter();
  const locale = useLocale();
  // 💡 2. TOTA LA LÒGICA D'EXCEL ARA ESTÀ AQUÍ
  const {
    isPending: isExcelPending, // Renombrem per claredat
    excelOptions,
    handleExcelAction
  } = useExcelActions({
    tableName: 'suppliers',
    limitStatus: supplierLimitStatus,
    translationKeys: {
      create: 'suppliers.create',
      load: 'suppliers.load',
      download: 'suppliers.download',
      limit: 'suppliers', // Clau de Shared.limits
    }
  });
  // ✅ 5. Estat per al modal i comprovació del límit
  const [showLimitModal, setShowLimitModal] = useState(false);
  const isLimitExceeded = supplierLimitStatus && !supplierLimitStatus.allowed;

  // --- Definició de Columnes (Sense canvis) ---
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

  // --- Hook Genèric (Sense canvis) ---
  const {
    isPending: isTablePending,
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
    initialFilters: {},
    initialSort: { column: 'nom', order: 'asc' },
    allColumns,
    fetchAction: fetchPaginatedSuppliers as (params: FetchSuppliersParams) => Promise<PaginatedSuppliersResponse>,
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'string') {
        const msg = tShared('errors.invalidId') + " (expected string UUID)";
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

  // --- Columnes Visibles i Descripció Esborrat (Sense canvis) ---
  const visibleColumns = useMemo(
    () => allColumns.filter(col => {
      const key: string | undefined = ('id' in col && col.id)
        ? col.id.toString()
        : ('accessorKey' in col && col.accessorKey)
          ? col.accessorKey.toString()
          : undefined;
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

  // ✅ 6. Gestor pel botó "Nou Proveïdor"
  const handleNewSupplierClick = () => {
    if (isLimitExceeded) {
      setShowLimitModal(true); // Mostra el modal si se supera el límit
    } else {
      router.push(`/${locale}/finances/suppliers/new`); // Navega si tot està bé
    }
  };

  // --- Renderització ---
  return (
    <div className="flex flex-col gap-4 h-full">
      <PageHeader title={t('title')}>

        {/* ✅ 7. Alerta de límit (només si se supera) */}
        {isLimitExceeded && (
          <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900 p-2 max-w-md">
            <TriangleAlert className="h-4 w-4 text-yellow-900" />
            <AlertTitle className="font-semibold text-xs mb-0">
              {t_billing('modalTitle', { default: 'Límit assolit' })}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {/* Assegura't que 'suppliers' existeix a 'Shared.limits' */}
              {supplierLimitStatus.error || t_billing('suppliers', { current: supplierLimitStatus.current, max: supplierLimitStatus.max })}

              <Button asChild variant="link" size="sm" className="p-0 h-auto ml-1 text-yellow-900 font-semibold underline">
                <Link href={`/${locale}/settings/billing`}>{t_billing('upgradeButton')}</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <ExcelDropdownButton
          options={excelOptions}
          onSelect={handleExcelAction}
          disabled={isExcelPending || isTablePending}
        />
        {/* ✅ 8. Botó ara utilitza el gestor onClick */}
        <Button onClick={handleNewSupplierClick}>
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
        isPending={isExcelPending || isTablePending} // 💡 6. Combinem els 'pending'        
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

      {/* ✅ 9. Modal de bloqueig (si l'usuari clica el botó) */}
      <AlertDialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="text-destructive" />
              {t_billing('modalTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {/* Assegura't que 'suppliers' existeix a 'Shared.limits' */}
              {t_billing('suppliers', {
                current: supplierLimitStatus?.current ?? 0,
                max: supplierLimitStatus?.max ?? 0
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