"use client";

import { useState, useTransition, useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { type InvoiceListRow, type InvoiceStatus } from '@/types/finances/invoices';
// ✅ CORRECCIÓ: Importem des del nou fitxer d'accions de detall
import { deleteInvoiceAction } from '../[invoiceId]/actions';

const DEFAULT_PAGE_SIZE = 10;
type ColumnVisibilityState = Record<string, boolean>;
type BasicColumnInfo = { key: string; header: string; defaultVisible?: boolean };

export function useInvoices() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('InvoicesPage');
  const [isPending, startTransition] = useTransition();

  // --- Estats inicials ---
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialPageSize = parseInt(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE.toString(), 10);
  const initialSearch = searchParams.get('search') || '';
  const initialSortBy = searchParams.get('sortBy') || 'issue_date';
  const initialSortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  const initialStatus = (searchParams.get('status') || 'all') as InvoiceStatus | 'all';
  const initialClientId = searchParams.get('contactId') || 'all';

  // --- Estats interns ---
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [clientFilter, setClientFilter] = useState(initialClientId);
  const [deleteItem, setDeleteItem] = useState<InvoiceListRow | null>(null);

  const allColumns = useMemo<BasicColumnInfo[]>(() => [
    { key: 'invoice_number', header: t('table.number'), defaultVisible: true },
    // ✅ CORRECCIÓ: La clau per ordenar és 'client_name', coincideix amb el RPC
    { key: 'client_name', header: t('table.client'), defaultVisible: true }, 
    { key: 'issue_date', header: t('table.invoiceDate'), defaultVisible: true },
    { key: 'due_date', header: t('table.dueDate'), defaultVisible: false },
    { key: 'total_amount', header: t('table.total'), defaultVisible: true },
    { key: 'status', header: t('table.status'), defaultVisible: true },
  ], [t]);

  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(() =>
    allColumns.reduce((acc, col) => {
      acc[col.key] = col.defaultVisible ?? true;
      return acc;
    }, {} as ColumnVisibilityState)
  );

  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setColumnVisibility(prev => {
        const currentVisibility = prev[columnKey];
        const defaultVisibility = allColumns.find(c => c.key === columnKey)?.defaultVisible ?? true;
        const nextVisibility = currentVisibility === undefined ? !defaultVisibility : !currentVisibility;
        return { ...prev, [columnKey]: nextVisibility };
    });
  }, [allColumns]);


  const updateQueryParams = useCallback(
    (newParams: Record<string, string | number | undefined | null>) => {
        const current = new URLSearchParams(searchParams.toString());
        let changed = false;

        Object.entries(newParams).forEach(([key, value]) => {
          const stringValue = value !== undefined && value !== null ? String(value) : '';
          const isDefault = (
              (key === 'page' && stringValue === '1') ||
              (key === 'status' && stringValue === 'all') ||
              (key === 'contactId' && stringValue === 'all') ||
              (key === 'pageSize' && stringValue === DEFAULT_PAGE_SIZE.toString()) ||
              (key === 'sortBy' && stringValue === 'issue_date') ||
              (key === 'sortOrder' && stringValue === 'desc')
          );

          if (stringValue === '' || isDefault) {
             if (current.has(key)) {
                current.delete(key);
                changed = true;
             }
          } else if (current.get(key) !== stringValue) {
             current.set(key, stringValue);
             changed = true;
          }
        });

        const shouldResetPage = newParams.search !== undefined || newParams.status !== undefined || newParams.contactId !== undefined || newParams.sortBy !== undefined || newParams.sortOrder !== undefined || newParams.pageSize !== undefined;

        if (shouldResetPage) {
          if (current.get('page')) {
             current.delete('page');
             changed = true;
          }
        }

        if (changed) {
            startTransition(() => {
                if (shouldResetPage && page !== 1) {
                    setPage(1);
                }
                router.push(`${pathname}?${current.toString()}`);
            });
        }
      }, [searchParams, router, pathname, startTransition, page]);

  // --- Handlers ---
  const handleSearchChangeInternal = useDebouncedCallback((term: string) => {
    updateQueryParams({ search: term || undefined });
  }, 300);

  const handleSearchChange = useCallback((term: string) => {
      setSearchTerm(term);
      handleSearchChangeInternal(term);
  },[handleSearchChangeInternal]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    updateQueryParams({ page: newPage });
  }, [updateQueryParams]);

  const handleSortChange = useCallback((newSortBy: string) => {
    // ✅ Assegurem que 'contacts.nom' es gestiona com 'client_name'
    const sortKey = newSortBy === 'contacts.nom' ? 'client_name' : newSortBy;
    const newSortOrder = sortBy === sortKey && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(sortKey);
    setSortOrder(newSortOrder);
    updateQueryParams({ sortBy: sortKey, sortOrder: newSortOrder });
  }, [sortBy, sortOrder, updateQueryParams]);

  const handleStatusChange = useCallback((newStatus: string) => {
      const validStatus = newStatus as InvoiceStatus | 'all';
      setStatusFilter(validStatus);
      updateQueryParams({ status: validStatus });
  }, [updateQueryParams]);

  const handleClientChange = useCallback((newClientId: string) => {
      setClientFilter(newClientId);
      updateQueryParams({ contactId: newClientId });
  }, [updateQueryParams]);

  const handleDelete = useCallback(() => {
    if (!deleteItem) return;
    const itemToDeleteId = deleteItem.id;
    if (typeof itemToDeleteId !== 'number') return;

    startTransition(async () => {
      // ✅ Aquesta funció ara s'importa de 'invoiceDetailActions.ts'
      const result = await deleteInvoiceAction(itemToDeleteId);
      if (result.success) {
        toast.success(result.message || t('toast.deleteSuccess'));
        setDeleteItem(null);
        // Podríem afegir router.refresh() si fos necessari,
        // però el revalidatePath ho hauria de gestionar.
      } else {
        toast.error(result.message || t('toast.deleteError'));
      }
    });
  }, [deleteItem, setDeleteItem, t, startTransition]);

  // Sincronitza estats interns si l'URL canvia externament
  useEffect(() => {
      setPage(initialPage);
      setPageSize(initialPageSize);
      setSearchTerm(initialSearch);
      setSortBy(initialSortBy);
      setSortOrder(initialSortOrder);
      setStatusFilter(initialStatus);
      setClientFilter(initialClientId);
  }, [initialPage, initialPageSize, initialSearch, initialSortBy, initialSortOrder, initialStatus, initialClientId]);


  return {
    // Estats
    page,
    pageSize,
    searchTerm,
    sortBy,
    sortOrder,
    statusFilter,
    clientFilter,
    isPending,
    deleteItem,
    // Visibilitat Columnes
    allColumns,
    columnVisibility,
    toggleColumnVisibility,

    // Handlers
    handleSearchChange,
    handlePageChange,
    handleSortChange,
    handleStatusChange,
    handleClientChange,
    setDeleteItem,
    handleDelete,
  };
}