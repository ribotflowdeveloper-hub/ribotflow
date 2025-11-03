// src/lib/services/comunicacio/templates.service.ts
import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { EmailTemplate, DbTableInsert, DbTableUpdate } from '@/types/db';

type ServerSupabaseClient = SupabaseClient<Database>;

/**
 * SERVEI: Obté totes les plantilles d'un equip.
 * Llança un error si falla.
 */
export async function getTemplates(
    supabase: ServerSupabaseClient,
    teamId: string // Afegim teamId per seguretat explícita
): Promise<EmailTemplate[]> {
    const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('team_id', teamId) // RLS ja ho hauria de fer, però ser explícit és bo
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error en carregar les plantilles (service):', error);
        throw new Error("No s'han pogut carregar les plantilles.");
    }

    // El tipus 'data' ja és EmailTemplate[] gràcies a db.ts
    return data || [];
}

/**
 * SERVEI: Desa (crea o actualitza) una plantilla d'email.
 * Llança un error si falla.
 */
export async function saveTemplate(
    supabase: ServerSupabaseClient,
    templateData: Omit<EmailTemplate, "id" | "created_at" | "user_id" | "team_id">,
    templateId: string | null,
    userId: string,
    activeTeamId: string
): Promise<EmailTemplate> {
    if (!templateData.name) {
        throw new Error("El nom de la plantilla és obligatori.");
    }

    let query;

    if (templateId && templateId !== 'new') {
        // Actualització
        const updateData: DbTableUpdate<'email_templates'> = templateData;
        query = supabase
            .from('email_templates')
            .update(updateData)
            .eq('id', Number(templateId))
            .eq('team_id', activeTeamId) // Seguretat
            .select()
            .single();
    } else {
        // Creació
        const insertData: DbTableInsert<'email_templates'> = {
            ...templateData,
            user_id: userId,
            team_id: activeTeamId
        };
        query = supabase
            .from('email_templates')
            .insert(insertData)
            .select()
            .single();
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error en desar la plantilla (service):", error);
        throw new Error(error.message);
    }

    return data;
}

/**
 * SERVEI: Elimina una plantilla d'email.
 * Llança un error si falla.
 */
export async function deleteTemplate(
    supabase: ServerSupabaseClient,
    templateId: string,
    activeTeamId: string
): Promise<void> {
    const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', Number(templateId))
        .eq('team_id', activeTeamId); // Seguretat

    if (error) {
        console.error("Error en eliminar la plantilla (service):", error);
        throw new Error(error.message);
    }
}