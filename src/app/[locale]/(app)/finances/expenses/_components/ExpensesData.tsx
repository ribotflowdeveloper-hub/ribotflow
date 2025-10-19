// src/app/[locale]/(app)/finances/despeses/_components/ExpensesData.tsx
import { redirect } from 'next/navigation';
import { ExpensesClient } from './ExpensesClient';
// ✅ Importem la nova funció
import { fetchPaginatedExpenses } from '../actions';
import { getTranslations } from 'next-intl/server';
import { createClient as createServerActionClient } from '@/lib/supabase/server'; 

export async function ExpensesData() {
    const supabase = createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login'); 
    }
    
    const t = await getTranslations('ExpensesPage');
    
    try {
        // ✅ Cridem la nova funció de paginació
        const initialData = await fetchPaginatedExpenses({
            searchTerm: '',
            category: 'all',
            status: 'all', // Assegura't de passar el filtre d'estat
            sortBy: 'expense_date',
            sortOrder: 'desc',
            limit: 50,
            offset: 0,
        });

        // ✅ Passem les dades inicials completes al client
        return <ExpensesClient initialData={initialData} />;
        
    } catch (error) {
        console.error("Error durant la càrrega de ExpensesData:", error);
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades de la pàgina de despeses. Si us plau, intenta-ho de nou més tard.");
    }
}