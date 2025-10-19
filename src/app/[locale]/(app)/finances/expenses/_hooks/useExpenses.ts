// src/app/[locale]/(app)/finances/despeses/_hooks/useExpenses.ts
import { useState, useEffect, useTransition, useRef } from 'react'; 
import { useDebounce } from 'use-debounce';
// ✅ Importem la nova funció i tipus
import { fetchPaginatedExpenses, type ExpenseFilters, type PaginatedExpensesResponse, deleteExpense } from '../actions';
import { type ExpenseWithContact } from '@/types/finances/expenses';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { type ColumnDef } from '@/components/shared/GenericDataTable'; 

interface UseExpensesProps {
  // ✅ Rebem les dades inicials paginades
  initialData: PaginatedExpensesResponse;
  allColumns: ColumnDef<ExpenseWithContact>[];
}
const PAGE_LIMIT = 15;

export function useExpenses({ initialData, allColumns }: UseExpensesProps) {
  const t = useTranslations('ExpensesPage');
  const tShared = useTranslations('Shared');
  const [isPending, startTransition] = useTransition();

  // ✅ Estats per la paginació
  const [expenses, setExpenses] = useState<ExpenseWithContact[]>(initialData.data);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    Math.ceil(initialData.count / PAGE_LIMIT)
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ category: 'all', status: 'all' });
  const [sorting, setSorting] = useState({ column: 'expense_date', order: 'desc' });
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  
  // Ref per evitar la recàrrega inicial (ja tenim initialData)
  const isInitialMount = useRef(true);

  // Gestió de visibilitat de columnes (sense canvis)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
      const initialState: Record<string, boolean> = {};
      allColumns.forEach(col => {
        initialState[col.accessorKey.toString()] = true;
      });
      return initialState;
  });

  const toggleColumnVisibility = (columnKey: string) => {
      setColumnVisibility(prev => ({
        ...prev,
        [columnKey]: !prev[columnKey],
      }));
  };

  // ✅ useEffect per Canvis de Filtre/Ordre (reseteja la paginació)
  // Quan un filtre canvia, forcem anar a la pàgina 1
  useEffect(() => {
      if (isInitialMount.current) return;
      setPage(1);
  }, [debouncedSearchTerm, filters.category, filters.status, sorting]); 

  // ✅ useEffect per Càrrega de Dades (quan la pàgina o filtres canvien)
  // Aquest és l'únic lloc que crida a la Server Action
  useEffect(() => {
      // Evitem el 'fetch' inicial perquè ja tenim 'initialData'
      if (isInitialMount.current) {
          isInitialMount.current = false;
          return;
      }

      startTransition(async () => {
          const offset = (page - 1) * PAGE_LIMIT;

          const serverFilters: ExpenseFilters = {
              searchTerm: debouncedSearchTerm,
              category: filters.category,
              status: filters.status, 
              sortBy: sorting.column,
              sortOrder: sorting.order as 'asc' | 'desc',
              limit: PAGE_LIMIT,
              offset: offset,
          };
          
          const result = await fetchPaginatedExpenses(serverFilters);

          // ✅ Ja no afegim, substituïm
          setExpenses(result.data);
          // ✅ Actualitzem el total de pàgines
          setTotalPages(Math.ceil(result.count / PAGE_LIMIT));
      });
  // Afegim 'page' a les dependències
  }, [page, debouncedSearchTerm, filters, sorting]); 

  
  // Gestors de canvi (sense canvis)
  const handleStatusChange = (value: string) => {
      setFilters(prev => ({ ...prev, status: value }));
  };
  
  const handleSort = (columnKey: string) => {
      setSorting(prev => {
          const isSameColumn = prev.column === columnKey;
          const newOrder = isSameColumn && prev.order === 'asc' ? 'desc' : 'asc';
          return { column: columnKey, order: newOrder };
      });
  };

  const handleSearchChange = (value: string) => {
      setSearchTerm(value);
  };

  const handleCategoryChange = (value: string) => {
      setFilters(prev => ({ ...prev, category: value }));
  };

  // ✅ NOU: Gestor de canvi de pàgina
  const handlePageChange = (newPage: number) => {
      if (newPage > 0 && newPage <= totalPages) {
          setPage(newPage);
          window.scrollTo(0, 0); // Opcional: puja a dalt de tot
      }
  };
  
  // Gestió d'eliminació
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseWithContact | null>(null);

  const handleDelete = () => {
      if (!expenseToDelete) return;

      startTransition(async () => {
          const result = await deleteExpense(expenseToDelete.id as number);
          if (result.success) {
              toast.success(result.message);
              setExpenseToDelete(null);

              // ✅ Recàrrega de dades
              // Forcem un 'refetch' de la pàgina actual
              // Si la pàgina actual queda buida, hauríem d'anar a l'anterior
              if (expenses.length === 1 && page > 1) {
                  setPage(prev => prev - 1);
              } else {
                  // Re-executem l'efecte de càrrega
                  isInitialMount.current = false;
                  // Creem una nova instància de filtres per forçar el 'useEffect'
                  setFilters(f => ({...f})); 
              }

          } else {
              toast.error(result.message);
          }
      });
  };

  return {
      isPending,
      expenses,
      searchTerm,
      filters,
      handleSearchChange,
      handleCategoryChange,
      handleStatusChange,
      handleSort,
      currentSortColumn: sorting.column,
      currentSortOrder: sorting.order,
      expenseToDelete,
      setExpenseToDelete,
      handleDelete,
      t,
      tShared,
      columnVisibility,
      toggleColumnVisibility,
      
      // ✅ Propietats de paginació
      page,
      totalPages,
      handlePageChange,
  };
}