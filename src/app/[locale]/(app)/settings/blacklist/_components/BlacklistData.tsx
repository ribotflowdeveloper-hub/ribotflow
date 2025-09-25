// /app/[locale]/settings/blacklist/_components/BlacklistData.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BlacklistClient } from './BlacklistClient';
import type { Rule } from '../page';

export async function BlacklistData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // --- LÒGICA D'EQUIP ACTIU ---
    // Aquesta és la nostra manera estàndard i segura de saber per a quin equip
    // hem de carregar les dades, evitant problemes de memòria cau.
    const { data: claimsString, error: claimsError } = await supabase.rpc('get_current_jwt_claims');
    if (claimsError || !claimsString) {
        redirect('/settings/team');
    }
    const claims = JSON.parse(claimsString);
    if (!claims.app_metadata?.active_team_id) {
        redirect('/settings/team');
    }
    // ----------------------------

    // ✅ La consulta ara és més simple. No té cap filtre manual.
    // La política RLS que crearem s'encarregarà de filtrar les regles
    // que pertanyen a l'equip actiu de l'usuari.
    const { data: rules, error } = await supabase
        .from('blacklist_rules')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error en carregar les regles de la blacklist (pot ser RLS):", error);
    }

    return <BlacklistClient initialRules={(rules as Rule[]) || []} />;
}