// /app/[locale]/(app)/crm/products/_components/ProductsData.tsx

import { ProductsClient } from "./ProductsClient";

import { type Database } from '@/types/supabase';
// Importem les noves accions i tipus
import { fetchPaginatedProducts, getUniqueProductCategories, type ProductPageFilters } from '../actions';
import { getTranslations } from 'next-intl/server'; // Per errors

// Tipus Product (es pot mantenir aquí o moure a un fitxer central de tipus)
export type Product = Database['public']['Tables']['products']['Row'];

// Constants inicials
const INITIAL_ROWS_PER_PAGE = 15; // Coincideix amb PRODUCT_ROWS_PER_PAGE_OPTIONS[0]
const INITIAL_SORT_COLUMN = 'name';
const INITIAL_SORT_ORDER = 'asc';

export async function ProductsData() {
    // Validació de sessió (validatePageSession ja redirigeix si cal)
    const t = await getTranslations('ProductsPage'); // Per errors

    try {
        // Obtenim dades i categories en paral·lel
        const [initialDataResult, categoriesResult] = await Promise.allSettled([
            fetchPaginatedProducts({
                searchTerm: '',
                filters: { category: 'all' } as ProductPageFilters,
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
            // Continuem sense categories
        }

        const initialData = initialDataResult.value;
        const categoriesForFilter = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];

        // Passem dades i categories al client
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