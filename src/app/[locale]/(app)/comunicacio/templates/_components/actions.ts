"use server";

import { revalidatePath } from "next/cache";
import { type EmailTemplate } from '../page';
import type { PostgrestError } from "@supabase/supabase-js";
import { validateUserSession } from "@/lib/supabase/session"; // ✅ 1. Importem la funció

/**
 * Desa (crea o actualitza) una plantilla d'email.
 */
export async function saveTemplateAction(
    templateData: Omit<EmailTemplate, "id" | "created_at" | "user_id" | "team_id">,
    templateId: string | null
): Promise<{ data: EmailTemplate | null; error: PostgrestError | null }> {
    // ✅ 2. Validació centralitzada de la sessió.
    const session = await validateUserSession();
    if ('error' in session) {
        return { data: null, error: { message: session.error.message } as PostgrestError };
    }
    const { supabase, user, activeTeamId } = session;

    if (!templateData.name) {
        return { data: null, error: { message: "El nom de la plantilla és obligatori." } as PostgrestError };
    }
    
    let query;

    if (templateId && templateId !== 'new') {
        // En actualitzar, la RLS verificarà l'accés.
        query = supabase
            .from('email_templates')
            .update(templateData)
            .eq('id', templateId)
            .select()
            .single();
    } else {
        // En crear, afegim l'ID de l'usuari i l'ID de l'equip actiu.
        query = supabase
            .from('email_templates')
            .insert({ 
                ...templateData, 
                user_id: user.id, 
                team_id: activeTeamId 
            })
            .select()
            .single();
    }

    const { data, error } = await query;

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
    // ✅ Fem el mateix aquí.
    const session = await validateUserSession();
    if ('error' in session) {
        return { error: { message: session.error.message } as PostgrestError };
    }
    const { supabase } = session;

    // La política RLS s'encarregarà de la seguretat.
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