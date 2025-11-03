// /app/[locale]/(app)/finances/quotes/_components/QuotesData.tsx (FITXER CORREGIT)
import { redirect } from 'next/navigation';
import { QuotesClient } from './QuotesClient';

// ✅ CORRECCIÓ: Importem l'acció des d'../actions
import { fetchPaginatedQuotes } from '../actions';
// ✅ CORRECCIÓ: Importem el tipus des del fitxer de tipus
import type { QuotePageFilters } from '@/types/finances/quotes';

import { createClient as createServerActionClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

// Constants inicials
const INITIAL_ROWS_PER_PAGE = 10;
const INITIAL_SORT_COLUMN = 'issue_date';
const INITIAL_SORT_ORDER = 'desc';

export async function QuotesData() {
    const supabase = createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    const t = await getTranslations('QuotesPage');

    try {
        const initialData = await fetchPaginatedQuotes({
            searchTerm: '',
            filters: { status: 'all' } as QuotePageFilters, 
            sortBy: INITIAL_SORT_COLUMN,
            sortOrder: INITIAL_SORT_ORDER,
            limit: INITIAL_ROWS_PER_PAGE,
            offset: 0,
        });

        return (
            <QuotesClient
                initialData={initialData}
            />
        );

    } catch (error) {
        console.error("Error during QuotesData loading:", error);
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades.");
    }
}