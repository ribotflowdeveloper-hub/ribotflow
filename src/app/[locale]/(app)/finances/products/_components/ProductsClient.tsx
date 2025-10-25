// /app/[locale]/(app)/crm/products/_components/ProductsClient.tsx
"use client";

import { useMemo, useState } from 'react'; // Afegim useState per al diàleg
import Link from 'next/link'; // Per a enllaços (opcional)
import { useLocale, useTranslations } from 'next-intl';
import { PlusCircle, Edit, Plus } from 'lucide-react'; // Importem Edit
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Tipus i Accions
import { type Product } from "./ProductsData"; // Tipus Product
import { type ActionResult } from '@/types/shared/actionResult';
import { fetchPaginatedProducts, deleteProduct, type ProductPageFilters } from '../actions';
// import { createProduct, updateProduct } from '../actions'; // Si els necessites aquí

// Components Compartits
import { Button } from "@/components/ui/button";
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';
import { ColumnToggleButton } from '@/components/shared/ColumnToggleButton';

// Components Específics
import { ProductsFilters } from './ProductsFilters';
import { ProductForm } from "./ProductForm"; // Mantenim el formulari
import { PageHeader } from '@/components/shared/PageHeader'; // Importa PageHeader
// Hook Genèric
import { usePaginatedResource, type PaginatedResponse, type PaginatedActionParams } from '@/hooks/usePaginateResource'; // <-- Corregit 'usePaginateResource' a 'usePaginatedResource'

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

  // Estat per al diàleg del formulari
  const [isFormOpen, setFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // --- Definició de Columnes ---
  const allColumns = useMemo<ColumnDef<Product>[]>(() => [
    {
      accessorKey: 'name',
      header: t('table.name'),
      enableSorting: true,
      // Opcional: Fer clicable per editar? O deixar botó explícit?
      cell: (product) => (
        // Pots fer-lo link a una pàgina de detall si existeix, o no
        <span className="font-medium">{product.name}</span>
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
      cell: (product) => formatCurrency(product.price ?? 0), // Gestionem null
      cellClassName: "text-right",
    },
    {
      accessorKey: 'iva',
      header: t('table.vat'), // Assegura't de tenir traducció
      enableSorting: false, // Probablement no cal ordenar per IVA
      cell: (product) => (product.iva !== null ? `${product.iva}%` : '-'),
      cellClassName: "text-right",
    },
    {
      accessorKey: 'unit',
      header: t('table.unit'),
      enableSorting: false,
      cell: (product) => product.unit || '-',
      cellClassName: "text-center", // O text-right
    },
    {
      accessorKey: 'is_active',
      header: t('table.active'), // Assegura't de tenir traducció
      enableSorting: true,
      cell: (product) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.is_active
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
          }`}>
          {product.is_active ? t('active') : t('inactive')}
        </span>
      ),
      cellClassName: "text-center",
    },
    // Accions Edit/Delete
    {
      accessorKey: "actions_edit",
      header: "", // Capçalera Accions (potser tShared('table.actions')?)
      enableSorting: false,
      cell: (product) => (
        <Button
          variant="ghost"
          size="icon"
          title={tShared('actions.edit')}
          onClick={() => handleEditClick(product)} // Funció per obrir diàleg
        >
          <Edit className="w-4 h-4" />
        </Button>
      ),
      cellClassName: "text-right", // Alineació del botó
    }
  ], [t, tShared, locale]); // Afegim dependències necessàries

  // --- Hook Genèric ---
  const {
    isPending,
    data: products, // Renombrem
    itemToDelete: productToDelete, // Renombrem
    setItemToDelete: setProductToDelete, // Renombrem
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
    // La funció de refetch pot ser útil després de desar el formulari
    // forceRefetch, // Si el hook l'exposa (hauríem d'afegir-ho)
  } = usePaginatedResource<Product, ProductPageFilters>({
    initialData,
    initialFilters: { category: 'all' },
    initialSort: { column: 'name', order: 'asc' },
    allColumns,
    fetchAction: fetchPaginatedProducts as (params: FetchProductsParams) => Promise<PaginatedProductsResponse>,
    deleteAction: deleteProduct as (id: string | number) => Promise<ActionResult>, // Passem directament si la signatura coincideix
    initialRowsPerPage: PRODUCT_ROWS_PER_PAGE_OPTIONS[0],
    rowsPerPageOptions: PRODUCT_ROWS_PER_PAGE_OPTIONS,
    toastMessages: {
      deleteSuccess: t('toast.deleteSuccess'), // Assegura't que existeix
    }
  });

  // --- Gestors per al Diàleg ---
  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setFormOpen(true);
  };

  const handleCreateClick = () => {
    setSelectedProduct(null);
    setFormOpen(true);
  };

  // Funció per tancar diàleg i potencialment refrescar dades
  const handleFormSuccess = (/* product: Product */) => {
    setFormOpen(false);
    // Idealment, el hook usePaginatedResource hauria d'exposar una funció
    // per forçar la recàrrega de la pàgina actual. Si no, podem fer:
    // isInitialMount.current = false; // (Hauria d'estar dins del hook)
    // setFilters(f => ({ ...f })); // Força refetch (requereix isInitialMount al hook)
    // O simplement confiar en revalidatePath (menys immediat visualment)
  };

  // --- Columnes Visibles i Descripció Esborrat ---
  const visibleColumns = useMemo(
    () => allColumns.filter(col => columnVisibility[col.accessorKey.toString()] ?? true),
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


  // --- Renderització ---
  return (
    <div className="h-full flex flex-col gap-4"> {/* Afegit gap-4 */}
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

      {/* Barra de Filtres / Accions */}
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

      {/* Taula Genèrica */}
      <GenericDataTable<Product>
        className="flex-grow overflow-hidden" // Per ocupar espai
        columns={visibleColumns}
        data={products}
        isPending={isPending} // Passa l'estat de càrrega
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
        deleteTitleKey="deleteDialog.title" // Clau genèrica
        deleteDescription={deleteDescription}
        emptyStateMessage={t('noProductsFound')} // Clau específica
      />
    </div>
  );
}