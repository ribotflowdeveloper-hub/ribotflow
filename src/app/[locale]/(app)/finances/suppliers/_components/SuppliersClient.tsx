"use client";

import { useTranslations } from 'next-intl';
import { PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

// ✅ SOLUCIÓ 1: Importem ColumnDef directament des del teu component genèric
import { GenericDataTable, type ColumnDef } from '@/components/shared/GenericDataTable';

import { type Supplier } from '@/types/finances/suppliers';
import { type PaginatedSuppliersResponse } from '../actions';
import { useSuppliers } from '../_hooks/useSuppliers';

import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils/formatters';

interface SuppliersClientProps {
  initialData: PaginatedSuppliersResponse;
}

export function SuppliersClient({ initialData }: SuppliersClientProps) {
  const t = useTranslations('SuppliersPage');
  const tShared = useTranslations('Shared');
  const router = useRouter();

  const {
    page,
    pageSize,
    searchTerm,
    handleSearchChange,
    handlePageChange,
    
    // Props per a GenericDataTable
    isPending,
    handleSortChange,
    sortBy,
    sortOrder,
    deleteItem,
    setDeleteItem,
    handleDelete,
  } = useSuppliers();

  const { data: suppliers, count: totalCount } = initialData;
  const totalPages = Math.ceil(totalCount / pageSize);

  // ✅ SOLUCIÓ 2: Definim les columnes amb la signatura correcta
  // La funció 'cell' rep la 'row' sencera, no un objecte { row }
  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: 'nom',
      header: t('table.name'),
      enableSorting: true,
      cell: (row) => ( // 'row' és l'objecte Supplier
        <div className="flex flex-col">
          <span 
            className="font-medium cursor-pointer hover:underline"
            onClick={() => router.push(`/finances/suppliers/${row.id}`)}
          >
            {row.nom}
          </span>
          {row.nif && <span className="text-muted-foreground text-xs">{row.nif}</span>}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: t('table.email'),
      enableSorting: true,
      cell: (row) => row.email || '-', // 'cell' és obligatori
    },
    {
      accessorKey: 'telefon',
      header: t('table.phone'),
      enableSorting: false,
      cell: (row) => row.telefon || '-', // 'cell' és obligatori
    },
    {
      accessorKey: 'created_at',
      header: t('table.created'),
      enableSorting: true,
      cell: (row) => formatDate(row.created_at), // 'cell' és obligatori
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      >
        <Button onClick={() => router.push('/finances/suppliers/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('newButton')}
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-4">
        {/* Filtres */}
        <div className="flex justify-between items-center">
          <Input
            placeholder={t('searchPlaceholder')}
            defaultValue={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        {/* ✅ SOLUCIÓ 3: Passem TOTES les props requerides a GenericDataTable */}
        <GenericDataTable
          // Dades i Columnes
          columns={columns}
          data={suppliers}
          
          // Estat de Càrrega
          isPending={isPending}
          
          // Ordenació
          onSort={handleSortChange}
          currentSortColumn={sortBy}
          currentSortOrder={sortOrder}
          
          // Paginació (que el component gestiona internament)
          page={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}

          // Eliminació
          onDelete={handleDelete}
          deleteItem={deleteItem}
          setDeleteItem={setDeleteItem}
          deleteTitleKey="deleteDialog.title" // Clau de traducció
          deleteDescription={tShared('deleteDialog.description1')} // Text estàndard
          
          // Estat Buit
          emptyStateMessage={t('emptyState')}
        />
        
        {/* ❌ Eliminem el PaginationBar independent,
            perquè GenericDataTable ja en té un a dins */}
      </div>
    </div>
  );
}