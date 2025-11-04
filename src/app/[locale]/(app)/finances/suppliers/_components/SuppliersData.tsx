// /app/[locale]/(app)/finances/suppliers/_components/SuppliersData.tsx (FITXER CORREGIT)
import { redirect } from 'next/navigation';
import { SuppliersClient } from './SuppliersClient';
import { createClient as createServerActionClient } from '@/lib/supabase/server';
import { getTranslations } from 'next-intl/server';

// ✅ 1. Importem les ACCIONS des d'../actions
import { fetchPaginatedSuppliers } from '../actions'; 
// ✅ 2. Importem els TIPUS des del SERVEI
import type { SupplierPageFilters } from '@/lib/services/finances/suppliers/suppliers.service';

// Constants inicials
const INITIAL_ROWS_PER_PAGE = 10;
const INITIAL_SORT_COLUMN = 'nom';
const INITIAL_SORT_ORDER = 'asc';

export async function SuppliersData() {
    const supabase = createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }
    const t = await getTranslations('SuppliersPage'); 

    try {
        const initialData = await fetchPaginatedSuppliers({
            searchTerm: '',
            filters: {} as SupplierPageFilters, 
            sortBy: INITIAL_SORT_COLUMN,
            sortOrder: INITIAL_SORT_ORDER,
            limit: INITIAL_ROWS_PER_PAGE,
            offset: 0,
        });

        // ✅ Comprovació d'errors eliminada: la funció ja llença excepcions si hi ha error

        return (
            <SuppliersClient initialData={initialData} />
        );

    } catch (error) {
        console.error("Error during SuppliersData loading:", error);
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades.");
    }
}