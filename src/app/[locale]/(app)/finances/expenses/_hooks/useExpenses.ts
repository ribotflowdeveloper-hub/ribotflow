// src/app/[locale]/(app)/finances/despeses/_hooks/useExpenses.ts
import { useState, useEffect, useTransition, useCallback } from 'react'; // Afegim useMemo
import { useDebounce } from 'use-debounce';
import { fetchExpenses, type ExpenseFilters, deleteExpense } from '../actions';
import { type ExpenseWithContact } from '@/types/finances/expenses';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { type ColumnDef } from '@/components/shared/GenericDataTable'; // Importem el tipus de columna

interface UseExpensesProps {
  initialExpenses: ExpenseWithContact[];
  // El hook necessita saber quines són totes les columnes possibles per inicialitzar l'estat
  allColumns: ColumnDef<ExpenseWithContact>[];
}

export function useExpenses({ initialExpenses, allColumns }: UseExpensesProps) {
  const t = useTranslations('ExpensesPage');
  const tShared = useTranslations('Shared');
  const [isPending, startTransition] = useTransition();

  // ... (tots els altres estats: expenses, searchTerm, filters, sorting, etc. no canvien)
  const [expenses, setExpenses] = useState<ExpenseWithContact[]>(initialExpenses);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ category: 'all', status: 'all' }); // ✅ NOU estat per al filtre
  const [sorting, setSorting] = useState({ column: 'expense_date', order: 'desc' });
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);


  // ✅ NOU: Estat per a la visibilitat de les columnes
  // Creem un objecte inicial on cada 'accessorKey' de columna és 'true' (visible)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    allColumns.forEach(col => {
      initialState[col.accessorKey.toString()] = true;
    });
    return initialState;
  });

  // ✅ NOU: Funció per canviar la visibilitat d'una columna
  const toggleColumnVisibility = (columnKey: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };

  const loadExpenses = useCallback(() => {
    startTransition(async () => {
      const serverFilters: ExpenseFilters = {
        searchTerm: debouncedSearchTerm,
        category: filters.category,
        status: filters.status, // ✅ NOU
        sortBy: sorting.column,
        sortOrder: sorting.order as 'asc' | 'desc',
      };
      const newExpenses = await fetchExpenses(serverFilters);
      setExpenses(newExpenses);
    });
  }, [debouncedSearchTerm, filters, sorting]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);
  // ✅ NOU: Gestor per al canvi de filtre d'estat
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

  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseWithContact | null>(null);

  const handleDelete = () => {
    if (!expenseToDelete) return;

    startTransition(async () => {
      const result = await deleteExpense(expenseToDelete.id as number);
      if (result.success) {
        toast.success(result.message);
        setExpenseToDelete(null);
        loadExpenses(); // Recarreguem les dades
      } else {
        toast.error(result.message);
      }
    });
  };

  return {
    // ... (totes les propietats que ja retornaves)
    isPending,
    expenses,
    searchTerm,
    filters,
    handleSearchChange,
    handleCategoryChange,
    handleStatusChange, // ✅ NOU
    handleSort,
    currentSortColumn: sorting.column,
    currentSortOrder: sorting.order,
    expenseToDelete,
    setExpenseToDelete,
    handleDelete,
    t,
    tShared,
    // ✅ NOU: Retornem l'estat i la funció per a la visibilitat
    columnVisibility,
    toggleColumnVisibility,
  };
}