import { ProductsClient } from "./ProductsClient";
import { type Database } from '@/types/supabase';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation'; // Importem redirect

import { fetchPaginatedProducts, getUniqueProductCategories } from '../actions';
import type { ProductPageFilters } from '@/lib/services/finances/products/products.service';

// ✅ 1. Importem guardians i comprovadors de límits
import { validateSessionAndPermission } from '@/lib/permissions/permissions';
import { PERMISSIONS } from '@/lib/permissions/permissions.config';
import { getUsageLimitStatus } from '@/lib/subscription/subscription';
import { type PlanLimit } from '@/config/subscriptions';

export type Product = Database['public']['Tables']['products']['Row'];

const INITIAL_ROWS_PER_PAGE = 15; 
const INITIAL_SORT_COLUMN = 'name';
const INITIAL_SORT_ORDER = 'asc';

export async function ProductsData() {
    // ✅ 2. Validació de VISTA
    const session = await validateSessionAndPermission(PERMISSIONS.VIEW_FINANCES);
    if ('error' in session) {
        redirect('/login');
    }

    const t = await getTranslations('ProductsPage'); 

    try {
        // ✅ 3. Comprovem dades, categories i límit en paral·lel
        const [initialDataResult, categoriesResult, limitStatusResult] = await Promise.allSettled([
            fetchPaginatedProducts({
                searchTerm: '',
                filters: { category: 'all' } as ProductPageFilters, 
                sortBy: INITIAL_SORT_COLUMN,
                sortOrder: INITIAL_SORT_ORDER,
                limit: INITIAL_ROWS_PER_PAGE,
                offset: 0,
            }),
            getUniqueProductCategories(),
            getUsageLimitStatus('maxProducts' as PlanLimit) // <-- Comprovem límit
        ]);

        if (initialDataResult.status === 'rejected') {
            console.error("Error fetching initial products data:", initialDataResult.reason);
            throw new Error(t('errors.loadDataFailed') || "Error en carregar les dades inicials de productes.");
        }
        if (categoriesResult.status === 'rejected') {
            console.error("Error fetching product categories:", categoriesResult.reason);
        }
        if (limitStatusResult.status === 'rejected') {
            console.error("Error fetching product limit status:", limitStatusResult.reason);
        }

        const initialData = initialDataResult.value;
        const categoriesForFilter = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
        // ✅ 4. Obtenim el resultat del límit
        const productLimitStatus = limitStatusResult.status === 'fulfilled' ? limitStatusResult.value : null;

        return (
            <ProductsClient
                initialData={initialData}
                categoriesForFilter={categoriesForFilter}
                productLimitStatus={productLimitStatus} // ✅ 5. Passem el prop
            />
        );

    } catch (error) {
        console.error("Unhandled error during ProductsData loading:", error);
        if (error instanceof Error) {
           throw error;
        }
        throw new Error(t('errors.loadDataFailed') || "No s'han pogut carregar les dades.");
    }
}