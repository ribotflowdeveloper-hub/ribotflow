import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { Opportunity, DbTableInsert, DbTableUpdate } from '@/types/db';

/**
 * SERVEI: Obté oportunitats amb la informació bàsica del contacte.
 */
export async function getOpportunitiesWithContact(supabase: SupabaseClient<Database>, teamId: string) {
  return supabase
    .from('opportunities')
    .select('*, contacts(id, nom)')
    .eq('team_id', teamId);
}

// ---
// ⚙️ NOVES FUNCIONS DE MUTACIÓ (Mogudes des de 'actions.ts')
// ---

/**
 * SERVEI: Desa (crea o actualitza) una oportunitat.
 * Llança un error si falla.
 */
export async function saveOpportunity(
    supabase: SupabaseClient<Database>,
    formData: FormData,
    userId: string,
    activeTeamId: string
): Promise<Opportunity> {
    
    const rawData = Object.fromEntries(formData.entries());
    
    const contactId = rawData.contact_id ? parseInt(rawData.contact_id as string, 10) : null;
    const opportunityId = rawData.id ? parseInt(rawData.id as string, 10) : null;
    const closeDateValue = rawData.close_date as string;

    // ✅ CORRECCIÓ: En lloc d'un tipus unió, definim l'objecte base.
    const dataToSave = {
        name: rawData.name as string,
        description: rawData.description as string,
        contact_id: contactId,
        stage_name: rawData.stage_name as string,
        value: rawData.value ? parseFloat(rawData.value as string) : null,
        close_date: closeDateValue ? new Date(closeDateValue).toISOString() : null,
        user_id: userId,
        team_id: activeTeamId,
    };

    let query;
    if (opportunityId) {
        // Actualització: El tipus DbTableUpdate és correcte
        query = supabase
            .from("opportunities")
            .update(dataToSave as DbTableUpdate<'opportunities'>) // Cast explícit
            .eq("id", opportunityId)
            .eq("team_id", activeTeamId);
    } else {
        // Inserció: El tipus DbTableInsert és correcte
        query = supabase
            .from("opportunities")
            // ✅ CORRECCIÓ: Assegurem que el tipus és DbTableInsert
            .insert(dataToSave as DbTableInsert<'opportunities'>); 
    }

    const { data, error } = await query.select().single();

    if (error) {
        console.error("Error en desar l'oportunitat (service):", error);
        throw new Error(error.message);
    }
    
    return data as Opportunity;
}

/**
 * SERVEI: Actualitza l'etapa (stage) d'una oportunitat.
 * Llança un error si falla.
 */
export async function updateOpportunityStage(
    supabase: SupabaseClient<Database>,
    opportunityId: number,
    newStage: string,
    activeTeamId: string
): Promise<void> {
    const { error } = await supabase
        .from("opportunities")
        .update({ stage_name: newStage })
        .eq("id", opportunityId)
        .eq("team_id", activeTeamId);

    if (error) {
        console.error("Error en actualitzar l'etapa (service):", error);
        throw new Error(error.message);
    }
}