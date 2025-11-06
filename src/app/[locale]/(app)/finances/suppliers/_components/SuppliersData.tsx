import { redirect } from 'next/navigation';
import { SuppliersClient } from './SuppliersClient';
import { getTranslations } from 'next-intl/server';

import { fetchPaginatedSuppliers } from '../actions'; 
import type { SupplierPageFilters } from '@/lib/services/finances/suppliers/suppliers.service';

// ✅ 1. Importem guardians i comprovadors de límits
import { validateSessionAndPermission } from '@/lib/permissions/permissions';
import { PERMISSIONS } from '@/lib/permissions/permissions.config';
import { getUsageLimitStatus } from '@/lib/subscription/subscription';
import { type PlanLimit } from '@/config/subscriptions';

// Constants inicials
const INITIAL_ROWS_PER_PAGE = 10;
const INITIAL_SORT_COLUMN = 'nom';
const INITIAL_SORT_ORDER = 'asc';

export async function SuppliersData() {
    // ✅ 2. Validació de VISTA
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ('error' in session) {
        redirect('/login');
    }
    // No necessitem supabase/user aquí, les accions ho gestionen

    const t = await getTranslations('SuppliersPage'); 

    try {
        // ✅ 3. Comprovem dades i límit en paral·lel
        const [initialDataResult, limitStatusResult] = await Promise.allSettled([
            fetchPaginatedSuppliers({
                searchTerm: '',
                filters: {} as SupplierPageFilters, 
                sortBy: INITIAL_SORT_COLUMN,
                sortOrder: INITIAL_SORT_ORDER,
                limit: INITIAL_ROWS_PER_PAGE,
                offset: 0,
            }),
            getUsageLimitStatus('maxSuppliers' as PlanLimit) // <-- Comprovem límit
        ]);

        // Gestionem errors
        if (initialDataResult.status === 'rejected') {
            console.error("Error fetching initial suppliers data:", initialDataResult.reason);
            throw new Error(t('errors.loadDataFailed') || "Error en carregar les dades inicials de proveïdors.");
        }
        if (limitStatusResult.status === 'rejected') {
            console.error("Error fetching suppliers limit status:", limitStatusResult.reason);
        }

        const initialData = initialDataResult.value;
        const supplierLimitStatus = limitStatusResult.status === 'fulfilled' ? limitStatusResult.value : null;

        return (
            <SuppliersClient 
                initialData={initialData} 
                supplierLimitStatus={supplierLimitStatus} // ✅ 4. Passem el límit
            />
        );

    } catch (error) {
        console.error("Error during SuppliersData loading:", error);
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades.");
    }
}