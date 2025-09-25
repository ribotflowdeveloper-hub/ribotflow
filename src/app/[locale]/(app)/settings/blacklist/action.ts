"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function addRuleAction(formData: FormData) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Usuari no autenticat." };
    }

    // --- NOVA LÒGICA D'EQUIP ACTIU ---
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { success: false, message: "No s'ha pogut determinar l'equip actiu." };
    }
    // ---------------------------------

    const newRule = formData.get('newRule') as string;
    if (!newRule || !newRule.trim()) {
        return { success: false, message: "La regla no pot estar buida." };
    }

    const value = newRule.trim().toLowerCase();
    const rule_type = value.includes('@') ? 'email' : 'domain';

    // ✅ La nova regla ara s'associa amb el 'team_id' i el 'user_id' de qui la crea.
    const { error } = await supabase.from('blacklist_rules').insert({ 
        user_id: user.id, 
        team_id: activeTeamId,
        value, 
        rule_type 
    });

    if (error) {
        console.error('Error afegint regla:', error);
        return { success: false, message: "No s'ha pogut afegir la regla. Potser ja existeix." };
    }

    revalidatePath('/settings/blacklist');
    return { success: true, message: "Regla afegida correctament." };
}

export async function deleteRuleAction(id: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Usuari no autenticat." };
    }
    
    // ✅ La consulta ara és més simple i segura.
    // La política RLS impedirà que un usuari esborri una regla que no pertany al seu equip actiu.
    // Ja no cal fer la comprovació manual amb '.match({ ..., user_id: user.id })'.
    const { error } = await supabase.from('blacklist_rules').delete().eq('id', id);

    if (error) {
        console.error('Error eliminant regla:', error);
        return { success: false, message: "No s'ha pogut eliminar la regla." };
    }
    
    revalidatePath('/settings/blacklist');
    return { success: true, message: "Regla eliminada." };
}