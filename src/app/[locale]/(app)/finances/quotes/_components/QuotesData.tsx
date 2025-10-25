// /app/[locale]/(app)/crm/quotes/_components/QuotesData.tsx
import { redirect } from 'next/navigation';
import { QuotesClient } from './QuotesClient'; // Client refactoritzat
// Importem accions i tipus nous
import { fetchPaginatedQuotes, type QuotePageFilters /*, getContactsForQuoteFilter */ } from '../actions';
import { createClient as createServerActionClient } from '@/lib/supabase/server'; // Si cal per validar sessió aquí
import { getTranslations } from 'next-intl/server'; // Per errors

// Constants inicials
const INITIAL_ROWS_PER_PAGE = 10;
const INITIAL_SORT_COLUMN = 'issue_date';
const INITIAL_SORT_ORDER = 'desc';

// Ja no necessitem rebre searchParams aquí
export async function QuotesData() {
    const supabase = createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    const t = await getTranslations('QuotesPage'); // Per errors

    try {
        // Cridem l'acció per dades inicials
        // Podríem cridar getContactsForQuoteFilter en paral·lel si l'implementem
        const initialData = await fetchPaginatedQuotes({
            searchTerm: '',
            filters: { status: 'all' } as QuotePageFilters, // Filtres inicials
            sortBy: INITIAL_SORT_COLUMN,
            sortOrder: INITIAL_SORT_ORDER,
            limit: INITIAL_ROWS_PER_PAGE,
            offset: 0,
        });

        // const contactsForFilter = await getContactsForQuoteFilter(); // Si s'implementa

        return (
            <QuotesClient
                initialData={initialData}
                // contactsForFilter={contactsForFilter} // Passa si s'implementa
            />
        );

    } catch (error) {
        console.error("Error during QuotesData loading:", error);
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades.");
    }
}