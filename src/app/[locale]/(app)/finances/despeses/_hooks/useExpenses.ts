// src/app/[locale]/(app)/finances/despeses/_hooks/useExpenses.ts
// Exemple basat en la lògica de useQuotes
import { useState, useTransition, useMemo } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ExpenseWithContact } from '@/types/finances/expenses';
import { deleteExpense } from '../actions'; // Importem la Server Action

interface UseExpensesProps {
    initialExpenses: ExpenseWithContact[];
    t: (key: string) => string; // Per traduccions
}

export function useExpenses({ initialExpenses }: UseExpensesProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const [isPending, startTransition] = useTransition();
    const [expenseToDelete, setExpenseToDelete] = useState<ExpenseWithContact | null>(null);

    // 1. Lògica d'ordenació
    const currentSortColumn = useMemo(() => {
        const key = Array.from(searchParams.keys()).find(key => key.startsWith('sortBy-'));
        return key ? key.replace('sortBy-', '') : null;
    }, [searchParams]);

    const currentSortOrder = searchParams.get(`sortBy-${currentSortColumn}`) as 'asc' | 'desc' | null;

    const handleSort = (column: string) => {
        const params = new URLSearchParams(searchParams.toString());
        const currentOrder = params.get(`sortBy-${column}`);
        
        // Netejar altres camps d'ordenació
        Array.from(params.keys()).forEach(key => {
            if (key.startsWith('sortBy-') && key !== `sortBy-${column}`) {
                params.delete(key);
            }
        });

        if (!currentOrder) {
            params.set(`sortBy-${column}`, 'asc');
        } else if (currentOrder === 'asc') {
            params.set(`sortBy-${column}`, 'desc');
        } else {
            params.delete(`sortBy-${column}`);
        }
        
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        });
    };

    // 2. Lògica d'eliminació
    const handleDelete = () => {
        if (!expenseToDelete) return;

        startTransition(async () => {
            // L'ID és bigint a la DB, per tant, el passem com a 'number'
            const result = await deleteExpense(expenseToDelete.id); 
            
            if (result.success) {
                toast.success(result.message);
                setExpenseToDelete(null); // Tancar el diàleg
            } else {
                toast.error(result.message);
            }
        });
    };

    // 3. Lògica de filtrat/ordenació a la UI (Hauria de ser millor al Server Component)
    // Per a llistes petites, la fem aquí. Per a grans, es fa al 'fetchExpenses' basat en `searchParams`.
    const sortedAndFilteredExpenses = useMemo(() => {
        // ... (Implementació de l'ordenació i filtre aquí o deixar que el Server Component ho faci)
        return initialExpenses; // Per ara, retornem les dades inicials
    }, [initialExpenses]); 

    return {
        isPending,
        expenses: sortedAndFilteredExpenses,
        expenseToDelete,
        setExpenseToDelete,
        handleSort,
        handleDelete,
        currentSortColumn,
        currentSortOrder,
        searchParams,
    };
}