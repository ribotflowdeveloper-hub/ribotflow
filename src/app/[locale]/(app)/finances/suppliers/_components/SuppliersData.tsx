// src/app/[locale]/(app)/finances/suppliers/_components/SuppliersData.tsx
import { redirect } from 'next/navigation';
import { fetchPaginatedSuppliers, type SupplierPageFilters } from '../actions'; // Acció refactoritzada
import { SuppliersClient } from './SuppliersClient'; // Client refactoritzat
import { createClient as createServerActionClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

// Constants inicials
const INITIAL_ROWS_PER_PAGE = 10;
const INITIAL_SORT_COLUMN = 'nom';
const INITIAL_SORT_ORDER = 'asc';

// Ja no necessitem rebre 'searchParams' aquí
export async function SuppliersData() {
    const supabase = createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    const t = await getTranslations('SuppliersPage'); // Per errors

    try {
        // Cridem l'acció amb els paràmetres inicials
        const initialData = await fetchPaginatedSuppliers({
            searchTerm: '',
            filters: {} as SupplierPageFilters, // Filtres buits
            sortBy: INITIAL_SORT_COLUMN,
            sortOrder: INITIAL_SORT_ORDER,
            limit: INITIAL_ROWS_PER_PAGE,
            offset: 0,
        });

        // Passem només les dades inicials al client
        return (
            <SuppliersClient initialData={initialData} />
        );

    } catch (error) {
        console.error("Error during SuppliersData loading:", error);
        // Gestionem l'error com als altres mòduls
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades.");
    }
}