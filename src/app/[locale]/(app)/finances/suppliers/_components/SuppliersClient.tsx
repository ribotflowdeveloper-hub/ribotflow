// src/app/[locale]/(app)/finances/suppliers/_components/SuppliersClient.tsx
"use client";

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
// 🆕 Importem totes les icones
import { PlusCircle, Edit, TriangleAlert, CheckSquare, Square, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/utils';

// Accions i Tipus
import { fetchPaginatedSuppliers, deleteSupplierAction, deleteBulkSuppliersAction } from '../actions';
import type { Supplier, SupplierPageFilters } from '@/lib/services/finances/suppliers/suppliers.service';
import { type ActionResult } from '@/types/shared/actionResult';
// Hooks
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource';
import { useMultiSelect } from '@/hooks/useMultiSelect';
// Utilitats
import { type UsageCheckResult } from '@/lib/subscription/subscription';
import { formatDate } from '@/lib/utils/formatters';
// Components UI
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { SuppliersFilters } from './SuppliersFilters';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ExcelDropdownButton from '@/components/features/excel/ExcelDropdownButton';
import { useExcelActions } from '@/components/features/excel/useExelActions';

// Alias i Constants
type PaginatedSuppliersResponse = PaginatedResponse<Supplier>;
type FetchSuppliersParams = PaginatedActionParams<SupplierPageFilters>;
const SUPPLIER_ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

// 🌟 OBJECTE DUMMY PER SENYALITZAR ELIMINACIÓ MASIVA
// El tipus ha de ser Supplier perquè la taula ho espera.
const BULK_DELETE_ITEM: Supplier & { isBulk: true } = {
  id: 'BULK_DELETE_ITEM', // ID única per a la detecció
  nom: 'BULK_DELETE',
  created_at: new Date().toISOString(),
  isBulk: true
} as Supplier & { isBulk: true };

interface SuppliersClientProps {
  initialData: PaginatedSuppliersResponse;
  supplierLimitStatus: UsageCheckResult | null;
}

export function SuppliersClient({
  initialData,
  supplierLimitStatus
}: SuppliersClientProps) {
  const t = useTranslations('SuppliersPage');
  const tShared = useTranslations('Shared');
  const tActions = useTranslations('Shared.actions');
  const t_billing = useTranslations('Shared.limits');
  const router = useRouter();
  const locale = useLocale();

  const { isPending: isExcelPending, excelOptions, handleExcelAction } = useExcelActions({
    tableName: 'suppliers', limitStatus: supplierLimitStatus,
    translationKeys: { create: 'suppliers.create', load: 'suppliers.load', download: 'suppliers.download', limit: 'suppliers', }
  });
  const [showLimitModal, setShowLimitModal] = useState(false);
  const isLimitExceeded = supplierLimitStatus && !supplierLimitStatus.allowed;

  // --- Definició de Columnes ---
  const allColumns = useMemo<ColumnDef<Supplier>[]>(() => [
    { accessorKey: 'nom', header: t('table.name'), enableSorting: true, cell: (supplier) => (<Link href={`/${locale}/finances/suppliers/${supplier.id}`} className="font-medium cursor-pointer text-primary hover:underline"> <div className="flex flex-col"> <span>{supplier.nom}</span> {supplier.nif && <span className="text-muted-foreground text-xs">{supplier.nif}</span>} </div> </Link>), },
    { accessorKey: 'email', header: t('table.email'), enableSorting: true, cell: (supplier) => supplier.email || '-', },
    { accessorKey: 'telefon', header: t('table.phone'), enableSorting: false, cell: (supplier) => supplier.telefon || '-', },
    { accessorKey: 'created_at', header: t('table.created'), enableSorting: true, cell: (supplier) => formatDate(supplier.created_at ?? ""), },
    { accessorKey: "actions_edit", header: "", enableSorting: false, cellClassName: "text-right", cell: (supplier) => (<Link href={`/${locale}/finances/suppliers/${supplier.id}`} title={tShared('actions.edit')}> <Button variant="ghost" size="icon"><Edit className="w-4 h-4" /></Button> </Link>), }
  ], [t, tShared, locale]);

  // --- Hook de Paginació (usePaginatedResource) ---
  const {
    isPending: isTablePending, data: suppliers, itemToDelete: supplierToDelete, setItemToDelete: setSupplierToDelete, handleDelete,
    handleSort, currentSortColumn, currentSortOrder, searchTerm, handleSearchChange,
    columnVisibility, toggleColumnVisibility, page, totalPages, handlePageChange, rowsPerPage, handleRowsPerPageChange,
  } = usePaginatedResource<Supplier, SupplierPageFilters>({
    initialData, initialFilters: {}, initialSort: { column: 'nom', order: 'asc' }, allColumns,
    fetchAction: fetchPaginatedSuppliers as (params: FetchSuppliersParams) => Promise<PaginatedSuppliersResponse>,
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'string') { const msg = tShared('errors.invalidId') + " (expected string UUID)"; return { success: false, message: msg }; }
      return deleteSupplierAction(id);
    },
    initialRowsPerPage: SUPPLIER_ROWS_PER_PAGE_OPTIONS[0], rowsPerPageOptions: SUPPLIER_ROWS_PER_PAGE_OPTIONS,
    toastMessages: { deleteSuccess: t('toast.deleteSuccess'), }
  });

  // --- 3. Hook de Selecció Múltiple (useMultiSelect) ---
  const {
    isMultiSelectActive, selectedItems, isBulkDeletePending,
    onToggleMultiSelect, onSelectAll, onSelectItem, handleBulkDelete, clearSelection,
  } = useMultiSelect<Supplier>({
    data: suppliers,
    bulkDeleteAction: (ids: (string | number)[]) => {
      // CLAU: Els IDs són strings/UUIDs, s'han de castejar a string[]
      return deleteBulkSuppliersAction(ids as string[]);
    },
    toastMessages: { bulkDeleteSuccess: t('toast.bulkDeleteSuccess'), bulkDeleteError: tShared('errors.genericDeleteError'), },
    onDeleteSuccess: () => { handleSort(currentSortColumn || 'nom'); },
  });

  // Neteja la selecció
  useEffect(() => { clearSelection(); }, [page, searchTerm, clearSelection]);

  // --- Lògica Unificada i Presentació ---
  const isBulkDeletionMode = isMultiSelectActive && selectedItems.length > 0;
  const isBulkDeletionDialog = supplierToDelete === (BULK_DELETE_ITEM as Supplier & { isBulk: true });

  const deleteTitleKey = isBulkDeletionDialog ? 'deleteDialog.titleBulk' : 'SuppliersPage.deleteDialog.title';

  const handleUnifiedDelete = () => {
    if (isBulkDeletionDialog) { handleBulkDelete(); }
    else if (supplierToDelete) { handleDelete(); }
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
    const supplierName = supplierToDelete
      ? supplierToDelete.nom
      : tShared('deleteDialog.defaultRecord');

    return (
      <>
        {tShared('deleteDialog.description1')}{' '}
        <span className="font-bold">{supplierName}</span>.
        <br />
        {tShared('deleteDialog.description2')}
      </>
    );
  }, [supplierToDelete, isBulkDeletionDialog, selectedItems.length, tShared]);


  const handleNewSupplierClick = () => {
    if (isLimitExceeded) { setShowLimitModal(true); } else { router.push(`/${locale}/finances/suppliers/new`); }
  };

  // --- Renderització ---
  return (
    <div className="flex flex-col gap-4 h-full">
      <PageHeader title={t('title')}>

        {isLimitExceeded && (
          <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900 p-2 max-w-md">
            <TriangleAlert className="h-4 w-4 text-yellow-900" />
            <AlertTitle className="font-semibold text-xs mb-0"> {t_billing('modalTitle', { default: 'Límit assolit' })} </AlertTitle>
            <AlertDescription className="text-xs">
              {supplierLimitStatus!.error || t_billing('suppliers', { current: supplierLimitStatus!.current, max: supplierLimitStatus!.max })}
              <Button asChild variant="link" size="sm" className="p-0 h-auto ml-1 text-yellow-900 font-semibold underline">
                <Link href={`/${locale}/settings/billing`}>{t_billing('upgradeButton')}</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <ExcelDropdownButton
          options={excelOptions} onSelect={handleExcelAction}
          disabled={isExcelPending || isTablePending || isMultiSelectActive}
        />
        <Button onClick={handleNewSupplierClick} disabled={isTablePending || isExcelPending || isMultiSelectActive}>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('newButton')}
        </Button>
      </PageHeader>

      {/* 2. 🌟 BARRA D'ACCIÓ RÀPIDA (Toggle + Eliminar + Filtres) */}
      <div className="flex justify-between items-start gap-4">

        <div className="flex items-center gap-2 flex-grow">
          {/* 🌟 1. Botó de Toggle (Esquerra del tot) */}
          <Button
            variant={isMultiSelectActive ? "secondary" : "ghost"} size="icon" onClick={onToggleMultiSelect}
            title={isMultiSelectActive ? tActions('cancelSelection') : tActions('selectItems')} disabled={isTablePending || isExcelPending}
            className={cn("flex-shrink-0 h-8 w-8", (isTablePending || isExcelPending) && "opacity-50 pointer-events-none")}
          >
            {isMultiSelectActive ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span className="sr-only">{isMultiSelectActive ? tActions('cancelSelection') : tActions('selectItems')}</span>
          </Button>

          {/* 🌟 2. Botó d'Eliminació Massiva (Apareix només si hi ha selecció) */}
          {isBulkDeletionMode && (
            <Button
              variant="destructive" size="sm"
              // 🔑 CLAU: Assginem el DUMMY per obrir l'AlertDialog
              onClick={() => setSupplierToDelete(BULK_DELETE_ITEM as Supplier | null)}
              disabled={selectedItems.length === 0 || isBulkDeletePending || isTablePending || isExcelPending}
              className="flex-shrink-0"
            >
              {(isBulkDeletePending || isTablePending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Trash2 className="w-4 h-4 mr-2" />
              {tActions('deleteCount', { count: selectedItems.length })}
            </Button>
          )}

          {/* 3. Filtres (Deshabilitats si la selecció està activa) */}
          <SuppliersFilters
            searchTerm={searchTerm} onSearchChange={handleSearchChange}
          />
        </div>

        {/* GRUP DRETA: Toggle de Columnes */}
        <ColumnToggleButton allColumns={allColumns} columnVisibility={columnVisibility} toggleColumnVisibility={toggleColumnVisibility} />
      </div>

      <GenericDataTable<Supplier>
        className="flex-grow overflow-hidden"
        columns={visibleColumns}
        data={suppliers}
        isPending={isExcelPending || isTablePending || isBulkDeletePending}
        onSort={handleSort} currentSortColumn={currentSortColumn} currentSortOrder={currentSortOrder as 'asc' | 'desc' | null}
        page={page} totalPages={totalPages} onPageChange={handlePageChange} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={SUPPLIER_ROWS_PER_PAGE_OPTIONS}

        deleteItem={supplierToDelete} setDeleteItem={setSupplierToDelete}
        onDelete={handleUnifiedDelete} // 🔑 Crida al gestor unificat
        // 🌟 PROPS DE SELECCIÓ MÚLTIPLE
        isMultiSelectActive={isMultiSelectActive} selectedItems={selectedItems} onToggleMultiSelect={onToggleMultiSelect}
        onSelectAll={onSelectAll} onSelectItem={onSelectItem} onBulkDelete={handleBulkDelete} isBulkDeletePending={isBulkDeletePending}

        deleteTitleKey={deleteTitleKey} deleteDescription={deleteDescription} emptyStateMessage={t('emptyState')}
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
              {supplierLimitStatus!.error || t_billing('suppliers', { current: supplierLimitStatus!.current ?? 0, max: supplierLimitStatus!.max ?? 0 })}
              <br /> {t_billing('upgradePlan')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Button variant="outline" onClick={() => setShowLimitModal(false)}>{tShared('actions.cancel')}</Button>
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(`/${locale}/settings/billing`)}>
              {t_billing('upgradeButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}