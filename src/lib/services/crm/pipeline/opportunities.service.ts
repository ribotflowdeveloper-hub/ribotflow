import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { Opportunity, DbTableInsert, DbTableUpdate } from '@/types/db';

/**
 * SERVEI: Obté oportunitats amb la informació bàsica del contacte.
 * (Aquesta funció no la fem servir a 'getPipelineData', però pot ser útil per altres llocs)
 */
export async function getOpportunitiesWithContact(supabase: SupabaseClient<Database>, teamId: string) {
  return supabase
    .from('opportunities')
    .select('*, contacts(id, nom)')
    .eq('team_id', teamId);
}

/**
 * ✅ NOU SERVEI: Obté oportunitats que pertanyen a una llista d'etapes.
 */
export async function getOpportunitiesInStages(
  supabase: SupabaseClient<Database>, 
  teamId: string, 
  stageIds: number[]
) {
  return supabase
    .from('opportunities')
    .select('*, contacts(id, nom)')
    .eq('team_id', teamId)
    // ✅ Filtrem per la llista d'etapes
    .in('pipeline_stage_id', stageIds);
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (CORREGIDES)
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

  // ✅ CORRECCIÓ: Llegim 'pipeline_stage_id' (número)
  const stageId = rawData.pipeline_stage_id ? parseInt(rawData.pipeline_stage_id as string, 10) : null;
  
  if (!stageId) {
      throw new Error("L'etapa és obligatòria.");
  }

  const dataToSave = {
    name: rawData.name as string,
    description: rawData.description as string,
    contact_id: contactId,
    // ✅ CORRECCIÓ: El camp de la BBDD es 'pipeline_stage_id'
    pipeline_stage_id: stageId,
    value: rawData.value ? parseFloat(rawData.value as string) : null,
    close_date: closeDateValue ? new Date(closeDateValue).toISOString() : null,
    user_id: userId,
    team_id: activeTeamId,
  };

  let query;
  if (opportunityId) {
    // Actualització
    query = supabase
      .from("opportunities")
      .update(dataToSave as DbTableUpdate<'opportunities'>)
      .eq("id", opportunityId)
      .eq("team_id", activeTeamId);
  } else {
    // Inserció
    query = supabase
      .from("opportunities")
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
  // ✅ CORRECCIÓ: Rebem l'ID de l'etapa (número)
  newStageId: number,
  activeTeamId: string
): Promise<void> {
  const { error } = await supabase
    .from("opportunities")
    // ✅ CORRECCIÓ: El camp de la BBDD és 'pipeline_stage_id'
    .update({ pipeline_stage_id: newStageId })
    .eq("id", opportunityId)
    .eq("team_id", activeTeamId);

  if (error) {
    console.error("Error en actualitzar l'etapa (service):", error);
    throw new Error(error.message);
  }
}