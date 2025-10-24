import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

// ✅ 1. Importem les nostres funcions de servei d'entitat
import { getPipelineStages } from './stages.service';
import { getBasicContacts } from '../contacts/contacts.service';
import { getOpportunitiesWithContact } from './opportunities.service';

// 2. Les definicions de tipus es mantenen igual. Són el "contracte" públic.
export type Stage = Database['public']['Tables']['pipeline_stages']['Row'];
export type Contact = Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom'>;
export type OpportunityWithContact = Database['public']['Tables']['opportunities']['Row'] & {
  contacts: Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom'> | null;
};

export type PipelineDataPayload = {
  stages: Stage[];
  contacts: Contact[];
  opportunities: OpportunityWithContact[];
};

// ✅ CORRECCIÓ 1:
// Substituïm 'any' per 'PostgrestError | null' per als errors de Supabase.
// Fem 'null' opcional perquè un error pot no existir.
export type PipelineDataError = {
  stagesError?: PostgrestError | null;
  contactsError?: PostgrestError | null;
  opportunitiesError?: PostgrestError | null;
}
/**
 * Obté totes les dades necessàries per a la vista del Pipeline (Cas d'Ús).
 * Orquestra crides a altres serveis d'entitat en paral·lel.
 */
export async function getPipelineData(
  supabase: SupabaseClient<Database>, 
  teamId: string
): Promise<{ data: PipelineDataPayload | null; error: PipelineDataError | null }> {
  
  // ✅ 3. La lògica de la consulta ARA ORQUESTRA ALTRES SERVEIS.
  // El Promise.all es manté aquí per garantir el rendiment.
  const [stagesRes, contactsRes, opportunitiesRes] = await Promise.all([
    getPipelineStages(supabase, teamId),
    getBasicContacts(supabase, teamId),
    getOpportunitiesWithContact(supabase, teamId)
  ]);

  // 4. La gestió d'errors es manté idèntica.
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

  // 5. El payload es manté idèntic.
  const payload: PipelineDataPayload = {
    stages: (stagesRes.data as Stage[]) || [],
    contacts: (contactsRes.data as Contact[]) || [],
    opportunities: (opportunitiesRes.data as OpportunityWithContact[]) || []
  };
  
  return { data: payload, error: null };
}