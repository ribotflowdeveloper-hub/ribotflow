"use server"; 

import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { Contact, Stage, Opportunity } from '@/types/db';


// Importem la lògica d'entitats
import { getPipelineStages } from './stages.service';
import { getAllContacts } from '../contacts/contacts.service';
import { getOpportunitiesInStages } from './opportunities.service'; 



export type OpportunityWithContact = Opportunity & {
  contacts: Pick<Contact, 'id' | 'nom'> | null;
};

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

// Obté els pipelines (selector)
export async function getPipelinesForTeam(
  supabase: SupabaseClient<Database>, 
  teamId: string
) {
  return supabase
    .from('pipelines')
    .select('id, name')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });
}

// Obté les dades del tauler (Board)
export async function getPipelineData(
  supabase: SupabaseClient<Database>,
  teamId: string,
  pipelineId: number
): Promise<{ data: PipelineDataPayload | null; error: PipelineDataError | null }> {
  
  // 1. Obtenir Etapes
  const stagesRes = await getPipelineStages(supabase, pipelineId);
  
  if (stagesRes.error) {
    console.error("Error a getPipelineData (stages):", stagesRes.error);
    return { data: null, error: { stagesError: stagesRes.error } };
  }
  
  const stages = (stagesRes.data as Stage[]) || [];
  
  if (stages.length === 0) {
    return { data: { stages: [], contacts: [], opportunities: [] }, error: null };
  }

  const stageIds = stages.map(s => s.id); 

  // 2. Obtenir Contactes i Oportunitats en paral·lel
  const [contactsRes, opportunitiesRes] = await Promise.all([
    // Wrapper segur per a contactes
    (async () => {
      try {
        const data = await getAllContacts(supabase, teamId);
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
    })(),
    getOpportunitiesInStages(supabase, teamId, stageIds)
  ]);

  if (contactsRes.error || opportunitiesRes.error) {
    console.error("Error a getPipelineData (data):", { 
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
    stages: stages, 
    contacts: (contactsRes.data as Contact[]) || [],
    opportunities: (opportunitiesRes.data as unknown as OpportunityWithContact[]) || []
  };

  return { data: payload, error: null };
}