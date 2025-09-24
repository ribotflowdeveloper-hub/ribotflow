"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { type EmailTemplate } from '../page';
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Desa (crea o actualitza) una plantilla d'email per a l'equip actiu.
 */
export async function saveTemplateAction(
    templateData: Omit<EmailTemplate, "id" | "created_at" | "user_id" | "team_id">,
    templateId: string | null
): Promise<{ data: EmailTemplate | null; error: PostgrestError | null }> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } as PostgrestError };

    // Obtenim l'equip actiu des del token.
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { data: null, error: { message: "No s'ha pogut determinar l'equip actiu." } as PostgrestError };
    }

    if (!templateData.name) {
        return { data: null, error: { message: "El nom de la plantilla és obligatori." } as PostgrestError };
    }
    
    let data: EmailTemplate | null = null;
    let error: PostgrestError | null = null;

    if (templateId && templateId !== 'new') {
        // En actualitzar, la política RLS verificarà automàticament que l'usuari
        // té accés a aquesta plantilla a través del seu equip actiu.
        ({ data, error } = await supabase
            .from('email_templates')
            .update(templateData)
            .eq('id', templateId)
            .select()
            .single());
    } else {
        // En crear, afegim l'ID de l'usuari i l'ID de l'equip actiu.
        ({ data, error } = await supabase
            .from('email_templates')
            .insert({ 
                ...templateData, 
                user_id: user.id, 
                team_id: activeTeamId 
            })
            .select()
            .single());
    }

    if (error) {
        console.error("Error en desar la plantilla:", error);
        return { data: null, error };
    }

    revalidatePath('/comunicacio/templates');
    return { data, error: null };
}

/**
 * Elimina una plantilla d'email.
 */
export async function deleteTemplateAction(
    templateId: string
): Promise<{ error: PostgrestError | null }> {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "Not authenticated" } as PostgrestError };

    // La política RLS s'encarregarà de verificar que l'usuari només pot
    // eliminar plantilles del seu equip actiu.
    const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);

    if (error) {
        console.error("Error en eliminar la plantilla:", error);
        return { error };
    }

    revalidatePath('/comunicacio/templates');
    return { error: null };
}