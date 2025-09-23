import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ProductsClient } from "./ProductsClient";


/**
 * Carrega les dades dels productes de l'equip de l'usuari actual.
 */
export async function ProductsData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return <ProductsClient initialProducts={[]} />;
    }

    // --- LÒGICA D'EQUIP ---
    // 1. Busquem l'equip de l'usuari actual.
    const { data: member, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

    if (memberError || !member) {
        console.error("L'usuari no pertany a cap equip.", memberError);
        return <ProductsClient initialProducts={[]} />;
    }
    const teamId = member.team_id;
    // ----------------------

    // 2. Obtenim els productes que pertanyen a l'equip.
    const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .eq("team_id", teamId) // ✅ Filtrem per team_id en lloc de user_id
        .order("name", { ascending: true });
        
    if (error) {
        console.error("Error en carregar els productes:", error);
        return <ProductsClient initialProducts={[]} />;
    }

    return <ProductsClient initialProducts={products || []} />;
}
