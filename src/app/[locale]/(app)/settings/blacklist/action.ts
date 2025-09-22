"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Server Action per afegir una nova regla a la blacklist de l'usuari.
 * @param formData Dades del formulari amb la nova regla.
 */
export async function addRuleAction(formData: FormData) {
    const supabase = createClient(cookies())
;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
        return { success: false, message: "Usuari no autenticat." };
    }
    const user = authData.user;

    const newRule = formData.get('newRule') as string;
    if (!newRule || !newRule.trim()) {
        return { success: false, message: "La regla no pot estar buida." };
    }

    const value = newRule.trim().toLowerCase(); // Normalitzem el valor a minúscules.
    // Determinem si és un 'email' o un 'domain' basant-nos en la presència d'una '@'.
    const rule_type = value.includes('@') ? 'email' : 'domain';

    // Inserim la nova regla a la base de dades.
    const { error } = await supabase.from('blacklist_rules').insert({ 
        user_id: user.id, 
        value, 
        rule_type 
    });

    if (error) {
        console.error('Error afegint regla:', error);
        return { success: false, message: "No s'ha pogut afegir la regla. Potser ja existeix." };
    }

    revalidatePath('/settings/blacklist'); // Actualitzem la pàgina al client.
    return { success: true, message: "Regla afegida correctament." };
}

/**
 * Server Action per eliminar una regla de la blacklist.
 * @param id L'ID de la regla a eliminar.
 */
export async function deleteRuleAction(id: string) {
    const cookieStore = cookies();
    const supabase = createClient(cookies())
;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
        return { success: false, message: "Usuari no autenticat." };
    }
    const user = authData.user;
    
    // Eliminem la regla fent 'match' per l'ID i l'ID de l'usuari per seguretat.
    const { error } = await supabase.from('blacklist_rules').delete().match({ id: id, user_id: user.id });

    if (error) {
        console.error('Error eliminant regla:', error);
        return { success: false, message: "No s'ha pogut eliminar la regla." };
    }
    
    revalidatePath('/settings/blacklist'); // Actualitzem la pàgina al client.
    return { success: true, message: "Regla eliminada." };
}