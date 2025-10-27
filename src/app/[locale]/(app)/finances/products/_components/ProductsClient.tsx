// /app/[locale]/(app)/crm/products/_components/ProductsClient.tsx
"use client";

import { useMemo } from 'react'; // Keep useState for creation dialog
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Edit } from 'lucide-react'; // Keep Edit for link, Plus for button

// Tipus i Accions
import { type Product } from "./ProductsData";
import { type ActionResult } from '@/types/shared/actionResult';
import { fetchPaginatedProducts, deleteProduct, type ProductPageFilters } from '../actions';
// createProduct/updateProduct actions are used within ProductForm

// Components Compartits
import { Button } from "@/components/ui/button";
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';
import { PageHeader } from '@/components/shared/PageHeader';

// Components Específics
import { ProductsFilters } from './ProductsFilters';

// Hook Genèric
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource'; // Corrected path

// Utilitats
import { formatCurrency } from '@/lib/utils/formatters';

// Alias i Constants
type PaginatedProductsResponse = PaginatedResponse<Product>;
type FetchProductsParams = PaginatedActionParams<ProductPageFilters>;
const PRODUCT_ROWS_PER_PAGE_OPTIONS = [15, 30, 50];

// Props del Component
interface ProductsClientProps {
  initialData: PaginatedProductsResponse;
  categoriesForFilter: string[];
}

export function ProductsClient({ initialData, categoriesForFilter }: ProductsClientProps) {
  const t = useTranslations('ProductsPage');
  const tShared = useTranslations('Shared');
  const locale = useLocale();



  // --- Column Definitions ---
  const allColumns = useMemo<ColumnDef<Product>[]>(() => [
    {
      accessorKey: 'name',
      header: t('table.name'),
      enableSorting: true,
      cell: (product) => (
        <Link
          // ✅ Corrected Route: crm/products/
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
      accessorKey: 'iva',
      header: t('table.vat'),
      enableSorting: false,
      cell: (product) => (product.iva !== null ? `${product.iva}%` : '-'),
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
    // Action column now only links to detail view (where edit/delete happens)
    {
      accessorKey: "actions_view_edit", // Renamed for clarity
      header: "", // Could add tShared('table.actions') if desired
      enableSorting: false,
      cell: (product) => (
        <Link
          // ✅ Corrected Route: crm/products/
          href={`/${locale}/finances/products/${product.id}`}
          title={tShared('actions.edit')} // Or view/edit
        >
          <Button variant="ghost" size="icon">
            <Edit className="w-4 h-4" />
          </Button>
        </Link>
      ),
      cellClassName: "text-right",
    }
  ], [t, tShared, locale]);

  // --- Generic Hook ---
  const {
    isPending,
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
    // Add forceRefetch if implemented in the hook
    // forceRefetch,
  } = usePaginatedResource<Product, ProductPageFilters>({
    initialData,
    initialFilters: { category: 'all' },
    initialSort: { column: 'name', order: 'asc' },
    allColumns,
    fetchAction: fetchPaginatedProducts as (params: FetchProductsParams) => Promise<PaginatedProductsResponse>,
    // ✅ Adapter for deleteProduct (Product ID is number)
    deleteAction: async (id: string | number): Promise<ActionResult> => {
      if (typeof id !== 'number') {
        const msg = tShared('errors.invalidId') + " (expected number)";
        console.error(msg, { id });
        return { success: false, message: msg };
      }
      // Assuming deleteProduct expects number and returns ActionResult
      return deleteProduct(id);
    },
    initialRowsPerPage: PRODUCT_ROWS_PER_PAGE_OPTIONS[0],
    rowsPerPageOptions: PRODUCT_ROWS_PER_PAGE_OPTIONS,
    toastMessages: {
      deleteSuccess: t('toast.deleteSuccess'),
    }
  });



  // --- Visible Columns & Delete Description ---
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

  // --- Rendering ---
  return (
    <div className="h-full flex flex-col gap-4">
      {/* Page Header with Create Button triggering Dialog */}
      {/* Capçalera i Botons */}
      {/* ✅ Substituïm la capçalera manual per PageHeader */}
      <PageHeader title={t('title')}>
        {/* El botó "Nou Producte" va com a 'children' */}
        <Button asChild>
          <Link href={`/${locale}/finances/products/new`}>
            <Plus className="w-4 h-4 mr-1" /> {t('newProductButton')}
          </Link>
        </Button>
      </PageHeader>

      {/* Filters Bar */}
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

      {/* Data Table */}
      <GenericDataTable<Product>
        className="flex-grow overflow-hidden"
        columns={visibleColumns}
        data={products}
        isPending={isPending}
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
        onDelete={handleDelete} // Delete confirmation handled by GenericDataTable
        deleteTitleKey="deleteDialog.title" // Use shared key
        deleteDescription={deleteDescription}
        emptyStateMessage={t('noProductsFound')}
      />
    </div>
  );
}