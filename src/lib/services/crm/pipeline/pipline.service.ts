import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

// ✅ 1. Importem els nostres serveis d'entitat
import { getPipelineStages } from './stages.service';
import { getAllContacts } from '../contacts/contacts.service'; // Aquesta funció retorna Promise<Contact[]>
import { getOpportunitiesWithContact } from './opportunities.service';

import type { Contact } from '@/types/db';

export type Stage = Database['public']['Tables']['pipeline_stages']['Row'];
export type OpportunityWithContact = Database['public']['Tables']['opportunities']['Row'] & {
  contacts: Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom'> | null;
};

export type PipelineDataPayload = {
  stages: Stage[];
  contacts: Contact[];
  opportunities: OpportunityWithContact[];
};

export type PipelineDataError = {
  stagesError?: PostgrestError | null;
  contactsError?: Error | null; // ✅ Canviat a 'Error' genèric
  opportunitiesError?: PostgrestError | null;
}

/**
 * Obté totes les dades necessàries per a la vista del Pipeline (Cas d'Ús).
 */
export async function getPipelineData(
  supabase: SupabaseClient<Database>, 
  teamId: string
): Promise<{ data: PipelineDataPayload | null; error: PipelineDataError | null }> {
  
  // ✅ CORRECCIÓ: Embolcallem 'getAllContacts' per gestionar el seu retorn
  const [stagesRes, contactsRes, opportunitiesRes] = await Promise.all([
    getPipelineStages(supabase, teamId),
    
    // Embolcallador (wrapper) per a getAllContacts
    (async () => {
      try {
        const data = await getAllContacts(supabase, teamId);
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    })(),
    
    getOpportunitiesWithContact(supabase, teamId)
  ]);

  // 5. Gestió d'errors (Ara 'contactsRes.error' existeix)
  if (stagesRes.error || contactsRes.error || opportunitiesRes.error) {
    console.error("Error a getPipelineData (service):", { 
      stages: stagesRes.error, 
      contacts: contactsRes.error, 
      opps: opportunitiesRes.error 
    });
    
    return {
      data: null,
      error: {
        stagesError: stagesRes.error,
        contactsError: contactsRes.error,
        opportunitiesError: opportunitiesRes.error
      }
    };
  }

  const payload: PipelineDataPayload = {
    stages: (stagesRes.data as Stage[]) || [],
    contacts: (contactsRes.data as Contact[]) || [], // ✅ Ara és correcte
    opportunities: (opportunitiesRes.data as OpportunityWithContact[]) || []
  };
  
  return { data: payload, error: null };
}