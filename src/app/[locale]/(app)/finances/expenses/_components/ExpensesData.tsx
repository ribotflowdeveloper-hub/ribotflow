import { redirect } from 'next/navigation';
import { ExpensesClient } from './ExpensesClient';
import { fetchPaginatedExpenses, getUniqueExpenseCategories } from '../actions';
import { getTranslations } from 'next-intl/server';

// ✅ 1. Importem els guardians i els comprovadors de límits
import { validateSessionAndPermission } from '@/lib/permissions/permissions';
import { PERMISSIONS } from '@/lib/permissions/permissions.config';
import { getUsageLimitStatus } from '@/lib/subscription/subscription';
import { type PlanLimit } from '@/config/subscriptions';

import type { ExpensePageFilters } from '@/lib/services/finances/expenses/expenses.service';

const INITIAL_PAGE_LIMIT = 10; // Reduït per coincidir amb el log

export async function ExpensesData() {
    // ✅ 2. Validació de PERMÍS DE VISTA (per carregar la pàgina)
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ('error' in session) {
        redirect('/login'); // O a una pàgina d'accés denegat
    }

    const t = await getTranslations('ExpensesPage');

    try {
        console.log("ExpensesData.tsx: Iniciant Promise.allSettled per dades inicials, categories i límit...");

        const [initialDataResult, categoriesResult, limitStatusResult] = await Promise.allSettled([
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
            getUniqueExpenseCategories(),
            // ✅ 3. Comprovem l'estat del límit de despeses
            getUsageLimitStatus('maxExpensesPerMonth' as PlanLimit)
        ]);

        if (initialDataResult.status === 'rejected') {
            console.error("Error fetching initial expenses data:", initialDataResult.reason);
            // Si la funció SQL falla, l'error es captura aquí
            throw new Error(t('errors.loadDataFailed') || "Error en carregar les dades inicials de despeses.");
        }
        if (categoriesResult.status === 'rejected') {
            console.error("Error fetching expense categories:", categoriesResult.reason);
        }
        if (limitStatusResult.status === 'rejected') {
            console.error("Error fetching expense limit status:", limitStatusResult.reason);
        }

        const initialData = initialDataResult.value;
        const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
        // ✅ 4. Obtenim el resultat del límit
        const expenseLimitStatus = limitStatusResult.status === 'fulfilled' ? limitStatusResult.value : null;

        return (
            <ExpensesClient
                initialData={initialData}
                filterOptions={{ categories }}
                expenseLimitStatus={expenseLimitStatus} // ✅ 5. Passem el prop al client
            />
        );

    } catch (error) {
        console.error("Unhandled error during ExpensesData loading:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades de la pàgina de despeses.");
    }
}