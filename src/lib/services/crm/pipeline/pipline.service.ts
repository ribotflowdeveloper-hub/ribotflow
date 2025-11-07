// src/lib/services/crm/pipeline/pipeline.service.ts
"use server"; // Assegura't que 'use server' hi és

import { type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { Contact } from '@/types/db';

// Serveis d'entitat
import { getPipelineStages } from './stages.service';
import { getAllContacts } from '../contacts/contacts.service';
import { getOpportunitiesInStages } from './opportunities.service'; 

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
  contactsError?: Error | null;
  opportunitiesError?: PostgrestError | null;
}

// ✅ 1. AFEGEIX AQUESTA FUNCIÓ QUE FALTAVA
/**
 * SERVEI: Obté els pipelines bàsics per a un equip (per a selectors)
 */
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

/**
 * Obté totes les dades necessàries per a UN pipeline específic (Cas d'Ús).
 */
export async function getPipelineData(
  supabase: SupabaseClient<Database>,
  teamId: string,
  pipelineId: number
): Promise<{ data: PipelineDataPayload | null; error: PipelineDataError | null }> {
  
  // ... (la resta de la teva funció 'getPipelineData' no canvia) ...
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
  const [contactsRes, opportunitiesRes] = await Promise.all([
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
    stages: stages, 
    contacts: (contactsRes.data as Contact[]) || [],
    opportunities: (opportunitiesRes.data as OpportunityWithContact[]) || []
  };
  return { data: payload, error: null };
}