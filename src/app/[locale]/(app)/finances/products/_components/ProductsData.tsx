// /app/[locale]/(app)/crm/products/_components/ProductsData.tsx (Refactoritzat)
import { ProductsClient } from "./ProductsClient";
import { validatePageSession } from "@/lib/supabase/session";
// ✅ 1. Importem la definició de la base de dades.
import { type Database } from '@/types/supabase';

// ✅ 2. Definim i exportem el tipus Product directament aquí.
export type Product = Database['public']['Tables']['products']['Row'];

export async function ProductsData() {
    const { supabase } = await validatePageSession();

    const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });
        
    if (error) {
        console.error("Error en carregar els productes (pot ser per RLS):", error);
        return <ProductsClient initialProducts={[]} />;
    }

    // ✅ 3. Passem les dades tal com venen de la BD, sense normalitzar.
    return <ProductsClient initialProducts={products || []} />;
}