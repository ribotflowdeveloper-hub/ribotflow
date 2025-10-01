import { ProductsClient } from "./ProductsClient";
import type { Product } from '@/types/crm/products'; 
import { validatePageSession } from "@/lib/supabase/session"; // ✅ 1. Importem la funció

export async function ProductsData() {
    // ✅ 2. Validació de sessió que gestiona les redireccions.
    const { supabase } = await validatePageSession();

    // La política RLS s'encarregarà de filtrar automàticament per l'equip actiu.
    const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });
        
    if (error) {
        console.error("Error en carregar els productes (pot ser per RLS):", error);
        return <ProductsClient initialProducts={[]} />;
    }

    // La normalització de dades nul·les segueix sent una bona pràctica.
    const normalizedProducts: Product[] = (products || []).map(p => ({
        ...p,
        description: p.description ?? null,
        category: p.category ?? null,
        unit: p.unit ?? null,
        iva: p.iva ?? null,
        discount: p.discount ?? null,
    }));

    return <ProductsClient initialProducts={normalizedProducts} />;
}