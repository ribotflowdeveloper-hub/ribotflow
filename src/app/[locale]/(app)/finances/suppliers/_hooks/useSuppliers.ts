"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { type Supplier } from '@/types/finances/suppliers';
import { deleteSupplierAction } from '../actions'; // Importem l'acció d'esborrar

const DEFAULT_PAGE_SIZE = 10;

export function useSuppliers() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('SuppliersPage.toast'); // Traduccions per als toasts
  
  const [isPending, startTransition] = useTransition();

  // Extreure i parsejar paràmetres de la URL
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE.toString(), 10);
  const searchTerm = searchParams.get('search') || '';
  
  // ✅ AFEGIT: Lògica d'ordenació
  const sortBy = searchParams.get('sortBy') || 'nom';
  const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

  // ✅ AFEGIT: Estat per al diàleg d'eliminació
  const [deleteItem, setDeleteItem] = useState<Supplier | null>(null);

  // Memoitzem els filtres per a la crida a l'API
  const filters = useMemo(() => ({
    searchTerm: searchTerm || undefined,
    sortBy,
    sortOrder,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }), [searchTerm, sortBy, sortOrder, pageSize, page]);

  // Funció per actualitzar la URL
  const updateQueryParams = (params: Record<string, string | number | undefined | null>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || String(value).length === 0) {
        current.delete(key);
      } else {
        current.set(key, String(value));
      }
    });

    // Si canviem un filtre, tornem a la pàgina 1
    if (params.search !== undefined || params.pageSize !== undefined || params.sortBy !== undefined) {
      current.set('page', '1');
    }
    
    // Fem la navegació amb 'startTransition'
    startTransition(() => {
        router.push(`${pathname}?${current.toString()}`);
    });
  };

  // Funció de cerca amb debounce
  const handleSearchChange = useDebouncedCallback((term: string) => {
    updateQueryParams({ search: term });
  }, 300);

  // Funcions per a la paginació
  const handlePageChange = (newPage: number) => {
    updateQueryParams({ page: newPage });
  };
  
  // ✅ AFEGIT: Funció d'ordenació
  const handleSortChange = (newSortBy: string) => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'asc' ? 'desc' : 'asc';
    updateQueryParams({ sortBy: newSortBy, sortOrder: newSortOrder });
  };
  
  // ✅ AFEGIT: Funció per gestionar l'eliminació
  const handleDelete = () => {
    if (!deleteItem) return;

    startTransition(async () => {
        const result = await deleteSupplierAction(deleteItem.id);
        if (result.success) {
            toast.success(t('deleteSuccess'));
            setDeleteItem(null);
            // No cal 'router.refresh()', la navegació de 'updateQueryParams' ja ho farà
            // si la pàgina es queda buida (tot i que 'revalidatePath' ja ho fa al servidor)
        } else {
            toast.error(result.message || t('deleteError'));
        }
    });
  };

  return {
    page,
    pageSize,
    searchTerm,
    filters,
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
  };
}