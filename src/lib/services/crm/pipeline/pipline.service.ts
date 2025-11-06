import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { Contact } from '@/types/db';

// Serveis d'entitat
import { getPipelineStages } from './stages.service';
import { getAllContacts } from '../contacts/contacts.service';
// ✅ Importem la nova funció per filtrar oportunitats
import { getOpportunitiesInStages } from './opportunities.service'; 

export type Stage = Database['public']['Tables']['pipeline_stages']['Row'];

// ✅ CORRECCIÓ: Aquest tipus era incorrecte, 'stage_name' no existeix a la BBDD.
// El tipus generat per Supabase ja hauria de ser correcte.
// Aquest tipus 'OpportunityWithContact' l'has definit tu, assegurem-nos que és correcte:
export type OpportunityWithContact = Database['public']['Tables']['opportunities']['Row'] & {
  contacts: Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom'> | null;
};
// (El teu tipus 'OpportunityWithContact' original és correcte, el mantenim)


export type PipelineDataPayload = {
  stages: Stage[];
  contacts: Contact[];
  opportunities: OpportunityWithContact[];
};

export type PipelineDataError = {
  stagesError?: PostgrestError | null;
  contactsError?: Error | null;
  opportunitiesError?: PostgrestError | null;
}

/**
 * Obté totes les dades necessàries per a UN pipeline específic (Cas d'Ús).
 */
export async function getPipelineData(
  supabase: SupabaseClient<Database>,
  teamId: string,
  pipelineId: number // ✅ Argument nou!
): Promise<{ data: PipelineDataPayload | null; error: PipelineDataError | null }> {
  
  // 1. Obtenim les etapes NOMÉS d'aquest pipeline
  const stagesRes = await getPipelineStages(supabase, pipelineId);
  
  // Si hi ha error o no hi ha etapes, no podem continuar
  if (stagesRes.error) {
    console.error("Error a getPipelineData (stages):", stagesRes.error);
    return { data: null, error: { stagesError: stagesRes.error } };
  }

  const stages = (stagesRes.data as Stage[]) || [];
  
  // Si no hi ha etapes, retornem llistes buides (no és un error)
  if (stages.length === 0) {
    return { data: { stages: [], contacts: [], opportunities: [] }, error: null };
  }
  
  const stageIds = stages.map(s => s.id); // Llista d'IDs d'etapa

  // 2. Obtenim contactes i oportunitats (filtrades per les etapes)
  const [contactsRes, opportunitiesRes] = await Promise.all([
    (async () => {
      try {
        const data = await getAllContacts(supabase, teamId);
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    })(),
    
    // ✅ Obtenim oportunitats NOMÉS si la seva etapa pertany a aquest pipeline
    getOpportunitiesInStages(supabase, teamId, stageIds)
  ]);

  // Gestió d'errors
  if (contactsRes.error || opportunitiesRes.error) {
    console.error("Error a getPipelineData (contacts/opps):", { 
      contacts: contactsRes.error, 
      opps: opportunitiesRes.error 
    });
    
    return {
      data: null,
      error: {
        contactsError: contactsRes.error,
        opportunitiesError: opportunitiesRes.error
      }
    };
  }

  const payload: PipelineDataPayload = {
    stages: stages, // Etapes filtrades
    contacts: (contactsRes.data as Contact[]) || [],
    opportunities: (opportunitiesRes.data as OpportunityWithContact[]) || []
  };
  
  return { data: payload, error: null };
}