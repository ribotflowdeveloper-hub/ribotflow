// src/app/[locale]/(app)/finances/despeses/page.tsx
import { fetchExpenses } from './actions';
import { ExpensesClient } from './_components/ExpensesClient';

interface ExpensesPageProps {
    searchParams: {
        page?: string;
        limit?: string;
        // Filtres
        searchTerm?: string;
        category?: string;
        status?: string;
        sortBy?: string;
        sortOrder?: string;
    };
}

/**
 * Pàgina principal (Server Component) per a la gestió de despeses.
 * La seva responsabilitat és carregar les dades i l'estat de la UI des dels searchParams.
 */
export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
    // 1. Parsejar els paràmetres des de l'URL (searchParams)
    const filters = {
        page: parseInt(searchParams.page || '1', 10),
        limit: parseInt(searchParams.limit || '50', 10),
        searchTerm: searchParams.searchTerm || undefined,
        category: searchParams.category || undefined,
        status: searchParams.status || undefined,
        sortBy: searchParams.sortBy || 'expense_date',
        sortOrder: searchParams.sortOrder as 'asc' | 'desc' || 'desc',
    };
    
    // 2. Càrrega de dades amb paginació i filtres
    try {
        // ✅ CORRECCIÓ: Cridem fetchExpenses amb els filtres obtinguts
        const paginatedData = await fetchExpenses(filters);

        // Passem només l'array de despeses al client
        return (
            <ExpensesClient 
                initialExpenses={paginatedData.data} 
                paginationInfo={{
                    totalCount: paginatedData.totalCount,
                    pageSize: paginatedData.pageSize,
                    currentPage: paginatedData.currentPage,
                }}
            />
        );
    } catch (error) {
        // L'error.tsx de Next.js s'encarregarà d'això
        throw error;
    }
}