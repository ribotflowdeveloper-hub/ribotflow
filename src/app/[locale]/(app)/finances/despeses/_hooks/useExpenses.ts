// src/app/[locale]/(app)/finances/despeses/_hooks/useExpenses.ts
import { useState, useEffect, useTransition, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { fetchExpenses, type ExpenseFilters, deleteExpense } from '../actions';
import { type ExpenseWithContact } from '@/types/finances/expenses';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface UseExpensesProps {
  initialExpenses: ExpenseWithContact[];
}

export function useExpenses({ initialExpenses }: UseExpensesProps) {
  // ✅ Centralitzem les dues instàncies de traducció aquí
  const t = useTranslations('ExpensesPage');
  const tShared = useTranslations('Shared');
  const [isPending, startTransition] = useTransition();

  const [expenses, setExpenses] = useState<ExpenseWithContact[]>(initialExpenses);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ category: 'all' });
  const [sorting, setSorting] = useState({ column: 'expense_date', order: 'desc' });
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const loadExpenses = useCallback(() => {
    startTransition(async () => {
      const serverFilters: ExpenseFilters = {
        searchTerm: debouncedSearchTerm,
        category: filters.category,
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
        if(result.success) {
            toast.success(result.message);
            setExpenseToDelete(null);
            loadExpenses(); // Recarreguem les dades
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
    handleSort,
    currentSortColumn: sorting.column,
    currentSortOrder: sorting.order,
    expenseToDelete,
    setExpenseToDelete,
    handleDelete,
    t,
    tShared, // ✅ Retornem tShared per al component
  };
}