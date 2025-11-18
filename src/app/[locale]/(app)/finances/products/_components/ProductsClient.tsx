// src/app/[locale]/(app)/crm/products/_components/ProductsClient.tsx
"use client";

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
// 🆕 Importem icones de la nova UX
import { Plus, Edit, TriangleAlert, CheckSquare, Square, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Tipus i Accions
import { type Product } from "./ProductsData"; // Assuming Product is defined here
import { type ActionResult } from '@/types/shared/actionResult';
import { fetchPaginatedProducts, deleteProduct, deleteBulkProductsAction } from '../actions'; // 🆕 Importem bulk delete
import type { ProductPageFilters } from '@/lib/services/finances/products/products.service';
import { type UsageCheckResult } from '@/lib/subscription/subscription';

// Components Compartits
import { Button } from "@/components/ui/button";
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils/utils';

import ExcelDropdownButton from '@/components/features/excel/ExcelDropdownButton';
import { useExcelActions } from '@/components/features/excel/useExelActions';

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

// Components Específics
import { ProductsFilters } from './ProductsFilters';

// Hook Genèric i Hook de Selecció
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource';
import { useMultiSelect } from '@/hooks/useMultiSelect'; // 🌟 NOU HOOK

// Utilitats
import { formatCurrency } from '@/lib/utils/formatters';

// Alias i Constants
type PaginatedProductsResponse = PaginatedResponse<Product>;
type FetchProductsParams = PaginatedActionParams<ProductPageFilters>;
const PRODUCT_ROWS_PER_PAGE_OPTIONS = [15, 30, 50];

// 🌟 OBJECTE DUMMY PER SENYALITZAR ELIMINACIÓ MASIVA
// Ha de complir amb les propietats mínimes de Product
const BULK_DELETE_ITEM: Product & { isBulk: true } = {
  id: -1,
  name: 'BULK_DELETE',
  price: 0,
  is_active: true,
  isBulk: true
} as Product & { isBulk: true };


interface ProductsClientProps {
  initialData: PaginatedProductsResponse;
  categoriesForFilter: string[];
  productLimitStatus: UsageCheckResult | null;
}

export function ProductsClient({
  initialData,
  categoriesForFilter,
  productLimitStatus
}: ProductsClientProps) {
  const t = useTranslations('ProductsPage');
  const tShared = useTranslations('Shared');
  const t_billing = useTranslations('Shared.limits');
  const tActions = useTranslations('Shared.actions');
  const locale = useLocale();
  const router = useRouter();

  const {
    isPending: isExcelPending,
    excelOptions,
    handleExcelAction
  } = useExcelActions({
    tableName: 'products',
    limitStatus: productLimitStatus,
    translationKeys: {
      create: 'products.create', load: 'products.load', download: 'products.download', limit: 'products',
    }
  });

  const [showLimitModal, setShowLimitModal] = useState(false);

  // 1. DEFINICIÓ DE COLUMNES (Incondicional)
  const allColumns = useMemo<ColumnDef<Product>[]>(() => [
    { accessorKey: 'name', header: t('table.name'), enableSorting: true, cell: (product) => (<Link href={`/${locale}/finances/products/${product.id}`} className="font-medium cursor-pointer hover:underline" title={`${tShared('actions.view')}: ${product.name}`}> {product.name} </Link>) },
    { accessorKey: 'category', header: t('table.category'), enableSorting: true, cell: (product) => product.category || '-', },
    { accessorKey: 'price', header: t('table.price'), enableSorting: true, cell: (product) => formatCurrency(product.price ?? 0), },
    { accessorKey: 'tax_rate', header: t('table.vat'), enableSorting: false, cell: (product) => (product.legacy_tax_rate !== null ? `${product.legacy_tax_rate}%` : '-'), },
    { accessorKey: 'unit', header: t('table.unit'), enableSorting: false, cell: (product) => product.unit || '-', },
    { accessorKey: 'is_active', header: t('table.active'), enableSorting: true, cell: (product) => (<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}> {product.is_active ? t('active') : t('inactive')} </span>), },
    { accessorKey: "actions_view_edit", header: "", enableSorting: false, cell: (product) => (<Link href={`/${locale}/finances/products/${product.id}`} title={tShared('actions.edit')}> <Button variant="ghost" size="icon"> <Edit className="w-4 h-4" /> </Button> </Link>), cellClassName: "text-right", }
  ], [t, tShared, locale]);

  // --- 2. Hook de Paginació (Sense MultiSelect) ---
  const {
    isPending: isTablePending, data: products, itemToDelete: productToDelete, setItemToDelete: setProductToDelete, handleDelete,
    handleSort, currentSortColumn, currentSortOrder, searchTerm, handleSearchChange, filters, handleFilterChange,
    columnVisibility, toggleColumnVisibility, page, totalPages, handlePageChange, rowsPerPage, handleRowsPerPageChange,
  } = usePaginatedResource<Product, ProductPageFilters>({
    initialData, initialFilters: { category: 'all' }, initialSort: { column: 'name', order: 'asc' }, allColumns,
    fetchAction: fetchPaginatedProducts as (params: FetchProductsParams) => Promise<PaginatedProductsResponse>,
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'number') { const msg = tShared('errors.invalidId') + " (expected number)"; return { success: false, message: msg }; }
      return deleteProduct(id);
    },
    initialRowsPerPage: PRODUCT_ROWS_PER_PAGE_OPTIONS[0], rowsPerPageOptions: PRODUCT_ROWS_PER_PAGE_OPTIONS,
    toastMessages: { deleteSuccess: t('toast.deleteSuccess'), }
  });

  // --- 3. Hook de Selecció Múltiple (useMultiSelect) ---
  const {
    isMultiSelectActive, selectedItems, isBulkDeletePending,
    onToggleMultiSelect, onSelectAll, onSelectItem, handleBulkDelete, clearSelection,
  } = useMultiSelect<Product>({
    data: products,
    bulkDeleteAction: (ids: (string | number)[]) => {
      const numberIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      return deleteBulkProductsAction(numberIds as number[]);
    },
    toastMessages: { bulkDeleteSuccess: t('toast.bulkDeleteSuccess'), bulkDeleteError: tShared('errors.genericDeleteError'), },
    onDeleteSuccess: () => { handleSort(currentSortColumn || 'name'); }, // Forcem refetch
  });

  // 🔑 Neteja la selecció quan hi ha canvis de dades o paginació
  useEffect(() => { clearSelection(); }, [page, searchTerm, filters, clearSelection]);

  // --- 4. Lògica de Presentació ---
  const visibleColumns = useMemo(
    () => allColumns.filter(col => {
      // Asegurem-nos de buscar per accessorKey (ja que no hi ha 'id' a ColumnDef)
      const key = col.accessorKey?.toString();
      return key ? (columnVisibility[key] ?? true) : true;
    }),
    [allColumns, columnVisibility]
  );

  const isBulkDeletionMode = isMultiSelectActive && selectedItems.length > 0;
  const isBulkDeletionDialog = productToDelete === BULK_DELETE_ITEM;
  const isLimitExceeded = productLimitStatus && !productLimitStatus.allowed;

  const deleteTitleKey = isBulkDeletionDialog
    ? 'Shared.deleteDialog.titleBulk'
    : 'ProductsPage.deleteDialog.title';

  // 🔑 CLAU: Gestor unificat (cridat pel GenericDataTable)
  const handleUnifiedDelete = () => {
    if (isBulkDeletionDialog) {
      handleBulkDelete();
    } else if (productToDelete) {
      handleDelete(); // Individual
    }
  };

  const deleteDescription = useMemo(() => {
    if (isBulkDeletionDialog) {
      return tShared('deleteDialog.descriptionBulk', { count: selectedItems.length });
    }
    const itemName = productToDelete
      ? productToDelete.name
      : tShared('deleteDialog.defaultRecord');

    return (
      <>
        {tShared('deleteDialog.description1')}{' '}
        <span className="font-bold">{itemName}</span>.
        <br />
        {tShared('deleteDialog.description2')}
      </>
    );
  }, [productToDelete, isBulkDeletionDialog, selectedItems.length, tShared]);


  const handleNewProductClick = () => {
    if (isLimitExceeded) {
      setShowLimitModal(true);
    } else {
      router.push(`/${locale}/finances/products/new`);
    }
  };

  // --- Rendering ---
  return (
    <div className="h-full flex flex-col gap-4">
      <PageHeader title={t('title')}>

        {/* ✅ 7. Alerta de límit (només si se supera) */}
        {isLimitExceeded && (
          <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-900 p-2 max-w-md">
            <TriangleAlert className="h-4 w-4 text-yellow-900" />
            <AlertTitle className="font-semibold text-xs mb-0">
              {t_billing('modalTitle', { default: 'Límit assolit' })}
            </AlertTitle>
            <AlertDescription className="text-xs">
              {productLimitStatus!.error || t_billing('products', { current: productLimitStatus!.current, max: productLimitStatus!.max })}
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
          disabled={isExcelPending || isTablePending || isMultiSelectActive}
        />
        {/* ✅ 8. Botó de Nou Producte (Deshabilitat en mode selecció) */}
        <Button onClick={handleNewProductClick} disabled={isTablePending || isExcelPending || isMultiSelectActive}>
          <Plus className="w-4 h-4 mr-1" /> {t('newProductButton')}
        </Button>
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
              onClick={() => setProductToDelete(BULK_DELETE_ITEM as Product | null)}
              disabled={selectedItems.length === 0 || isBulkDeletePending || isTablePending || isExcelPending}
              className="flex-shrink-0"
            >
              {(isBulkDeletePending || isTablePending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Trash2 className="w-4 h-4 mr-2" />
              {tActions('deleteCount', { count: selectedItems.length })}
            </Button>
          )}

          {/* 3. Filtres (Deshabilitats si la selecció està activa) */}
          <ProductsFilters
            searchTerm={searchTerm} onSearchChange={handleSearchChange} filters={filters} onFilterChange={handleFilterChange}
            categories={categoriesForFilter} 
          />
        </div>

        {/* GRUP DRETA: Toggle de Columnes */}
        <ColumnToggleButton allColumns={allColumns} columnVisibility={columnVisibility} toggleColumnVisibility={toggleColumnVisibility} />
      </div>


      {/* Data Table */}
      <GenericDataTable<Product>
        className="flex-grow overflow-hidden"
        columns={visibleColumns}
        data={products}
        isPending={isExcelPending || isTablePending || isBulkDeletePending}
        onSort={handleSort}
        currentSortColumn={currentSortColumn}
        currentSortOrder={currentSortOrder as 'asc' | 'desc' | null}
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={PRODUCT_ROWS_PER_PAGE_OPTIONS}

        deleteItem={productToDelete}
        setDeleteItem={setProductToDelete}
        onDelete={handleUnifiedDelete} // 🔑 Crida al gestor unificat 
        // PROPS DE MULTI SELECT
        isMultiSelectActive={isMultiSelectActive} selectedItems={selectedItems} onToggleMultiSelect={onToggleMultiSelect}
        onSelectAll={onSelectAll} onSelectItem={onSelectItem} onBulkDelete={handleBulkDelete} isBulkDeletePending={isBulkDeletePending}

        deleteTitleKey={deleteTitleKey}
        deleteDescription={deleteDescription}
        emptyStateMessage={t('noProductsFound')}
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
              {t_billing('products', {
                current: productLimitStatus?.current ?? 0,
                max: productLimitStatus?.max ?? 0
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