// src/app/[locale]/(app)/finances/expenses/_components/ExpensesData.tsx
import { redirect } from 'next/navigation';
import { ExpensesClient } from './ExpensesClient';
import { fetchPaginatedExpenses, getUniqueExpenseCategories } from '../actions'; // Ja importàvem les dues
import { getTranslations } from 'next-intl/server';
import { createClient as createServerActionClient } from '@/lib/supabase/server';
import { type ExpensePageFilters } from '../actions';

const INITIAL_PAGE_LIMIT = 15;

export async function ExpensesData() {
    const supabase = createServerActionClient();
    // Validació inicial per si l'usuari no està autenticat
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const t = await getTranslations('ExpensesPage');

    try {
        // Obtenim dades inicials i categories en paral·lel
        const [initialDataResult, categoriesResult] = await Promise.allSettled([
            fetchPaginatedExpenses({
                searchTerm: '',
                filters: {
                    category: 'all',
                    status: 'all',
                } as ExpensePageFilters,
                sortBy: 'expense_date',
                sortOrder: 'desc',
                limit: INITIAL_PAGE_LIMIT,
                offset: 0,
            }),
            // getUniqueExpenseCategories ara gestiona la sessió internament
            getUniqueExpenseCategories()
        ]);

        // Gestionem errors
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
        console.log("ExpensesData: Passing categories to ExpensesClient:", categories);
        // Passem dades i opcions de filtre al client
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