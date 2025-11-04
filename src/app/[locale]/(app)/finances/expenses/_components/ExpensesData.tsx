// src/app/[locale]/(app)/finances/expenses/_components/ExpensesData.tsx (FITXER CORREGIT)
import { redirect } from 'next/navigation';
import { ExpensesClient } from './ExpensesClient';
import { fetchPaginatedExpenses, getUniqueExpenseCategories } from '../actions';
import { getTranslations } from 'next-intl/server';
import { createClient as createServerActionClient } from '@/lib/supabase/server';

// ✅ CORRECCIÓ: Importem el tipus directament des del SERVEI DE LLISTA
import type { ExpensePageFilters } from '@/lib/services/finances/expenses/expenses.service';

const INITIAL_PAGE_LIMIT = 15; // Nota: El teu servei té un fallback de 50, assegura't que 'limit' s'està aplicant correctament.

export async function ExpensesData() {
    const supabase = createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const t = await getTranslations('ExpensesPage');

    try {
        // 🔴 LOG 8: Iniciant càrrega de dades (Consola del Servidor)
        console.log("ExpensesData.tsx: Iniciant Promise.allSettled per dades inicials i categories...");

        const [initialDataResult, categoriesResult] = await Promise.allSettled([
            fetchPaginatedExpenses({
                searchTerm: '',
                filters: {
                    category: 'all',
                    status: 'all',
                } as ExpensePageFilters, // ✅ Ara 'ExpensePageFilters' es troba
                sortBy: 'expense_date',
                sortOrder: 'desc',
                limit: INITIAL_PAGE_LIMIT,
                offset: 0,
            }),
            getUniqueExpenseCategories()
        ]);

        if (initialDataResult.status === 'rejected') {
            console.error("Error fetching initial expenses data:", initialDataResult.reason);
            throw new Error(t('errors.loadDataFailed') || "Error en carregar les dades inicials de despeses.");
        }
        if (categoriesResult.status === 'rejected') {
            console.error("Error fetching expense categories:", categoriesResult.reason);
            console.warn("No s'han pogut carregar les categories per filtrar.");
        }

        const initialData = initialDataResult.value;
        const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
        
        // 🔴 LOG 9: Dades que es passen al ExpensesClient (Consola del Servidor)
        console.log("ExpensesData.tsx: Dades inicials obtingudes:", JSON.stringify(initialData, null, 2));
        console.log("ExpensesData.tsx: Categories obtingudes:", JSON.stringify(categories, null, 2));


        return (
            <ExpensesClient
                initialData={initialData}
                filterOptions={{ categories }}
            />
        );

    } catch (error) {
        console.error("Unhandled error during ExpensesData loading:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades de la pàgina de despeses. Si us plau, intenta-ho de nou més tard.");
    }
}