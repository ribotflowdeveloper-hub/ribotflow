"use client";

// ✅ 1. Importem 'useState', 'useRouter' i components necessaris
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Edit, TriangleAlert } from 'lucide-react'; // 💡 2. Importem icones d'Excel
import { useRouter } from 'next/navigation'; // ✅ Importem 'useRouter'

// Tipus i Accions
import { type Product } from "./ProductsData";
import { type ActionResult } from '@/types/shared/actionResult';
import { fetchPaginatedProducts, deleteProduct } from '../actions';
import type { ProductPageFilters } from '@/lib/services/finances/products/products.service';
import { type UsageCheckResult } from '@/lib/subscription/subscription'; // ✅ Importem tipus de límit
// Components Compartits
import { Button } from "@/components/ui/button";
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { PageHeader } from '@/components/shared/PageHeader';

// 💡 3. Importem el botó i accions d'Excel
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

// Hook Genèric
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource';

// Utilitats
import { formatCurrency } from '@/lib/utils/formatters';

// Alias i Constants
type PaginatedProductsResponse = PaginatedResponse<Product>;
type FetchProductsParams = PaginatedActionParams<ProductPageFilters>;
const PRODUCT_ROWS_PER_PAGE_OPTIONS = [15, 30, 50];

// ✅ 3. Actualitzem les Props
interface ProductsClientProps {
  initialData: PaginatedProductsResponse;
  categoriesForFilter: string[];
  productLimitStatus: UsageCheckResult | null; // <-- NOVA PROP
}

export function ProductsClient({
  initialData,
  categoriesForFilter,
  productLimitStatus // ✅ 4. Rebem la prop
}: ProductsClientProps) {
  const t = useTranslations('ProductsPage');
  const tShared = useTranslations('Shared');
  const t_billing = useTranslations('Shared.limits'); // Per als missatges
  const locale = useLocale();
  const router = useRouter(); // Per al modal i el botó

  // 💡 2. TOTA LA LÒGICA D'EXCEL ARA ESTÀ AQUÍ
  const {
    isPending: isExcelPending, // Renombrem per claredat
    excelOptions,
    handleExcelAction
  } = useExcelActions({
    tableName: 'products',
    limitStatus: productLimitStatus,
    translationKeys: {
      create: 'products.create',
      load: 'products.load',
      download: 'products.download',
      limit: 'products', // Clau de Shared.limits
    }
  });

  const [showLimitModal, setShowLimitModal] = useState(false);
  const isLimitExceeded = productLimitStatus && !productLimitStatus.allowed;

  // --- Column Definitions (Sense canvis) ---
  const allColumns = useMemo<ColumnDef<Product>[]>(() => [
    // ... (El teu codi de columnes és correcte)
    {
      accessorKey: 'name',
      header: t('table.name'),
      enableSorting: true,
      cell: (product) => (
        <Link
          // ✅ Compte! La ruta és /finances/products/[id]
          href={`/${locale}/finances/products/${product.id}`}
          className="font-medium cursor-pointer hover:underline"
          title={`${tShared('actions.view')}: ${product.name}`}
        >
          {product.name}
        </Link>
      ),
    },
    {
      accessorKey: 'category',
      header: t('table.category'),
      enableSorting: true,
      cell: (product) => product.category || '-',
    },
    {
      accessorKey: 'price',
      header: t('table.price'),
      enableSorting: true,
      cell: (product) => formatCurrency(product.price ?? 0),
    },
    {
      accessorKey: 'tax_rate',
      header: t('table.vat'),
      enableSorting: false,
      cell: (product) => (product.legacy_tax_rate !== null ? `${product.legacy_tax_rate}%` : '-'),
    },
    {
      accessorKey: 'unit',
      header: t('table.unit'),
      enableSorting: false,
      cell: (product) => product.unit || '-',
    },
    {
      accessorKey: 'is_active',
      header: t('table.active'),
      enableSorting: true,
      cell: (product) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.is_active
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
          }`}>
          {product.is_active ? t('active') : t('inactive')}
        </span>
      ),
    },
    {
      accessorKey: "actions_view_edit",
      header: "",
      enableSorting: false,
      cell: (product) => (
        <Link
          // ✅ Compte! La ruta és /finances/products/[id]
          href={`/${locale}/finances/products/${product.id}`}
          title={tShared('actions.edit')}
        >
          <Button variant="ghost" size="icon">
            <Edit className="w-4 h-4" />
          </Button>
        </Link>
      ),
      cellClassName: "text-right",
    }
  ], [t, tShared, locale]);

  // --- Generic Hook (Sense canvis) ---
  const {
    isPending: isTablePending, // 💡 6. Renombrem per evitar conflicte amb 'isPending' d'Excel    
    data: products,
    itemToDelete: productToDelete,
    setItemToDelete: setProductToDelete,
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
  } = usePaginatedResource<Product, ProductPageFilters>({
    initialData,
    initialFilters: { category: 'all' },
    initialSort: { column: 'name', order: 'asc' },
    allColumns,
    fetchAction: fetchPaginatedProducts as (params: FetchProductsParams) => Promise<PaginatedProductsResponse>,
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'number') {
        const msg = tShared('errors.invalidId') + " (expected number)";
        return { success: false, message: msg };
      }
      return deleteProduct(id);
    },
    initialRowsPerPage: PRODUCT_ROWS_PER_PAGE_OPTIONS[0],
    rowsPerPageOptions: PRODUCT_ROWS_PER_PAGE_OPTIONS,
    toastMessages: {
      deleteSuccess: t('toast.deleteSuccess'),
    }
  });

  // --- Visible Columns & Delete Description (Sense canvis) ---
  const visibleColumns = useMemo(
    () => allColumns.filter(col => {
      const key = ('id' in col && col.id)
        ? col.id.toString()
        : col.accessorKey?.toString();
      return key ? (columnVisibility[key] ?? true) : true;
    }),
    [allColumns, columnVisibility]
  );
  const deleteDescription = (
    <>
      {tShared('deleteDialog.description1')}{' '}
      <span className="font-bold">{productToDelete?.name}</span>.
      <br />
      {tShared('deleteDialog.description2')}
    </>
  );
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
              {/* Assegura't que 'products' existeix a 'Shared.limits' */}
              {productLimitStatus.error || t_billing('products', { current: productLimitStatus.current, max: productLimitStatus.max })}
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
        {/* ✅ 8. Botó ara utilitza el gestor onClick */}
        <Button onClick={handleNewProductClick}>
          <Plus className="w-4 h-4 mr-1" /> {t('newProductButton')}
        </Button>
      </PageHeader>

      {/* Filters Bar (Sense canvis) */}
      <div className="flex justify-between items-center">
        <ProductsFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          filters={filters}
          onFilterChange={handleFilterChange}
          categories={categoriesForFilter}
        />
        <ColumnToggleButton
          allColumns={allColumns}
          columnVisibility={columnVisibility}
          toggleColumnVisibility={toggleColumnVisibility}
        />
      </div>

      {/* Data Table (Sense canvis) */}
      <GenericDataTable<Product>
        className="flex-grow overflow-hidden"
        columns={visibleColumns}
        data={products}
        isPending={isExcelPending || isTablePending} // 💡 6. Combinem els 'pending'        
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
        onDelete={handleDelete}
        deleteTitleKey="deleteDialog.title"
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