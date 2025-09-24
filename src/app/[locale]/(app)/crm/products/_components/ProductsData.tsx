import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ProductsClient } from "./ProductsClient";
// ✅ Assegura't que aquest import apunta al teu fitxer de tipus centralitzat
import type { Product } from '@/types/crm/products'; 

export async function ProductsData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return redirect('/settings/team');
    }

    // La política RLS de la taula 'products' s'encarregarà de filtrar automàticament.
    const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });
        
    if (error) {
        console.error("Error en carregar els productes (pot ser per RLS):", error);
        return <ProductsClient initialProducts={[]} />;
    }

    // Aquesta normalització és una bona pràctica per a assegurar la compatibilitat de tipus.
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