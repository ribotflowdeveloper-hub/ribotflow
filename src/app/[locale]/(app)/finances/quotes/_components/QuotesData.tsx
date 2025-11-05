// /app/[locale]/(app)/finances/quotes/_components/QuotesData.tsx (FITXER COMPLET I CORREGIT)
import { redirect } from 'next/navigation';
import { QuotesClient } from './QuotesClient';
import { fetchPaginatedQuotes } from '../actions';
import type { QuotePageFilters } from '@/types/finances/quotes';
import { createClient as createServerActionClient } from '@/lib/supabase/server';

// ✅ 1. Importem els helpers de límits
import { getUsageLimitStatus, type UsageCheckResult } from "@/lib/subscription/subscription";

// Constants inicials
const INITIAL_ROWS_PER_PAGE = 10;
const INITIAL_SORT_COLUMN = 'issue_date';
const INITIAL_SORT_ORDER = 'desc';

// ✅ 2. Definim un estat de límit per defecte per si la sessió falla
const defaultLimit: UsageCheckResult = { allowed: false, current: 0, max: 0, error: "Sessió no vàlida" };

export async function QuotesData() {
    const supabase = createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    try {
        // ✅ 3. Executem la càrrega de dades i la comprovació de límit en paral·lel
        const [initialData, limitCheck] = await Promise.all([
            fetchPaginatedQuotes({
                searchTerm: '',
                filters: { status: 'all' } as QuotePageFilters, 
                sortBy: INITIAL_SORT_COLUMN,
                sortOrder: INITIAL_SORT_ORDER,
                limit: INITIAL_ROWS_PER_PAGE,
                offset: 0,
            }),
            getUsageLimitStatus('maxQuotesPerMonth') // <-- COMPROVACIÓ DEL LÍMIT MENSUAL
        ]);

        return (
            <QuotesClient
                initialData={initialData}
                limitStatus={limitCheck} // ✅ 4. Passem l'estat del límit al client
            />
        );

    } catch (error) {
        console.error("Error during QuotesData loading:", error);
        // Si les dades fallen, igualment intentem renderitzar el client
        // amb el límit (potser només falla la llista) i dades buides.
        let limitCheck = defaultLimit;
        try {
            limitCheck = await getUsageLimitStatus('maxQuotesPerMonth');
        } catch { /* Ignorem l'error si 'getUsageLimitStatus' també falla */ }
        
        return (
            <QuotesClient
                initialData={{ data: [], count: 0 }}
                limitStatus={limitCheck}
            />
        );
    }
}