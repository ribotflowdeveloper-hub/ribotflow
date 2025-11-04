// /app/[locale]/(app)/crm/products/_components/ProductsData.tsx (FITXER CORREGIT)
import { ProductsClient } from "./ProductsClient";
import { type Database } from '@/types/supabase';
import { getTranslations } from 'next-intl/server';

// ✅ 1. Importem les ACCIONS des d'../actions
import { fetchPaginatedProducts, getUniqueProductCategories } from '../actions';

// ✅ 2. Importem els TIPUS des del SERVEI
import type { ProductPageFilters } from '@/lib/services/finances/products/products.service';
export type Product = Database['public']['Tables']['products']['Row'];

// Constants inicials
const INITIAL_ROWS_PER_PAGE = 15; 
const INITIAL_SORT_COLUMN = 'name';
const INITIAL_SORT_ORDER = 'asc';

export async function ProductsData() {
    const t = await getTranslations('ProductsPage'); 

    try {
        const [initialDataResult, categoriesResult] = await Promise.allSettled([
            fetchPaginatedProducts({
                searchTerm: '',
                filters: { category: 'all' } as ProductPageFilters, // ✅ Aquest tipus ara es troba
                sortBy: INITIAL_SORT_COLUMN,
                sortOrder: INITIAL_SORT_ORDER,
                limit: INITIAL_ROWS_PER_PAGE,
                offset: 0,
            }),
            getUniqueProductCategories()
        ]);

        // Gestionem errors
        if (initialDataResult.status === 'rejected') {
            console.error("Error fetching initial products data:", initialDataResult.reason);
            throw new Error(t('errors.loadDataFailed') || "Error en carregar les dades inicials de productes.");
        }
        if (categoriesResult.status === 'rejected') {
            console.error("Error fetching product categories:", categoriesResult.reason);
        }

        const initialData = initialDataResult.value;
        const categoriesForFilter = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];

        return (
            <ProductsClient
                initialData={initialData}
                categoriesForFilter={categoriesForFilter}
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