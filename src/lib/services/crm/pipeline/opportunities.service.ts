// src/lib/services/crm/pipeline/opportunities.service.ts
"use server"; 

import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import type { Opportunity, DbTableInsert, DbTableUpdate } from '@/types/db';

interface CreateOpportunityParams {
  supabase: SupabaseClient<Database>;
  contactId: number;
  teamId: string;
  userId: string;
  contactName: string; 
  // ✅ 1. AFEGIT: L'ID del pipeline seleccionat
  pipelineId: number;
}

// ... (getOpportunitiesWithContact, getOpportunitiesInStages, saveOpportunity, updateOpportunityStage, deleteOpportunity NO CANVIEN) ...
export async function getOpportunitiesWithContact(supabase: SupabaseClient<Database>, teamId: string) {
  return supabase
    .from('opportunities')
    .select('*, contacts(id, nom)')
    .eq('team_id', teamId);
}
export async function getOpportunitiesInStages(
  supabase: SupabaseClient<Database>, 
  teamId: string, 
  stageIds: number[]
) {
  return supabase
    .from('opportunities')
    .select('*, contacts(id, nom)')
    .eq('team_id', teamId)
    .in('pipeline_stage_id', stageIds);
}
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
  const stageId = rawData.pipeline_stage_id ? parseInt(rawData.pipeline_stage_id as string, 10) : null;
  if (!stageId) {
      throw new Error("L'etapa és obligatòria.");
  }
  const dataToSave = {
    name: rawData.name as string,
    description: rawData.description as string,
    contact_id: contactId,
    pipeline_stage_id: stageId,
    value: rawData.value ? parseFloat(rawData.value as string) : null,
    close_date: closeDateValue ? new Date(closeDateValue).toISOString() : null,
    user_id: userId,
    team_id: activeTeamId,
  };
  let query;
  if (opportunityId) {
    query = supabase
      .from("opportunities")
      .update(dataToSave as DbTableUpdate<'opportunities'>)
      .eq("id", opportunityId)
      .eq("team_id", activeTeamId);
  } else {
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
export async function updateOpportunityStage(
  supabase: SupabaseClient<Database>,
  opportunityId: number,
  newStageId: number,
  activeTeamId: string
): Promise<void> {
  const { error } = await supabase
    .from("opportunities")
    .update({ pipeline_stage_id: newStageId })
    .eq("id", opportunityId)
    .eq("team_id", activeTeamId);
  if (error) {
    console.error("Error en actualitzar l'etapa (service):", error);
    throw new Error(error.message);
  }
}
export async function deleteOpportunity(
  supabase: SupabaseClient<Database>,
  opportunityId: number,
  activeTeamId: string
): Promise<void> {
  const { error } = await supabase
    .from("opportunities")
    .delete()
    .eq("id", opportunityId)
    .eq("team_id", activeTeamId);
  if (error) {
    console.error("Error en eliminar l'oportunitat (service):", error);
    throw new Error("No s'ha pogut eliminar l'oportunitat.");
  }
}


/**
 * SERVEI: Crea una nova oportunitat per a un contacte si no n'existeix cap d'oberta.
 * S'utilitza en enviar un correu des de l'inbox.
 */
export async function createOpportunityFromEmail({
  supabase,
  contactId,
  teamId,
  userId,
  contactName,
  // ✅ 2. AFEGIT: Rebem l'ID del pipeline
  pipelineId,
}: CreateOpportunityParams): Promise<void> {
  
  // 1. ✅ LÒGICA NOVA: Trobar la primera etapa (o "Contactat") DINS del pipeline especificat.
  
  let stageIdToAssign: number;
  let enumStageNameToAssign: "Nou Lead" | "Contactat" | "Proposta Enviada" | "Negociació" | "Guanyat" | "Perdut" = "Contactat"; // Default

  // Intentem buscar 'Contactat' dins del pipeline rebut
  const { data: contactatStage } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipelineId) // Filtrem pel pipeline correcte
    .ilike('name', 'Contactat') // 'ilike' per 'Contactat', 'contactat', etc.
    .limit(1)
    .single();

  if (contactatStage) {
    // Trobada! Assignem el seu ID
    stageIdToAssign = contactatStage.id;
  } else {
    // Fallback: Si no existeix, agafem la PRIMERA etapa d'aquest pipeline
    const { data: firstStage, error: stageError } = await supabase
      .from('pipeline_stages')
      .select('id, name') // Agafem el nom per si és un valor de l'enum
      .eq('pipeline_id', pipelineId) // Filtrem pel pipeline correcte
      .order('position', { ascending: true })
      .limit(1)
      .single();
    
    if (stageError || !firstStage) {
      throw new Error(`El pipeline seleccionat (ID: ${pipelineId}) no té cap etapa configurada.`);
    }
    stageIdToAssign = firstStage.id;
    
    // Mapegem el nom de l'etapa a l'ENUM (per si l'enum 'stage_name' és obligatori)
    const validStages = ["Nou Lead", "Contactat", "Proposta Enviada", "Negociació", "Guanyat", "Perdut"];
    if (validStages.includes(firstStage.name)) {
      enumStageNameToAssign = firstStage.name as typeof enumStageNameToAssign;
    } else {
      enumStageNameToAssign = "Nou Lead"; // Default de la BBDD
    }
  }

  // 2. Comprovació de duplicats (aquesta lògica estava bé)
  const { data: existingOpportunities, error: checkError } = await supabase
    .from("opportunities")
    .select("id")
    .eq("contact_id", contactId)
    .eq("team_id", teamId)
    .not("stage_name", "in", '("Guanyat", "Perdut")')
    .limit(1);

  if (checkError) {
    console.error("Error comprovant oportunitats existents (service):", checkError);
    throw new Error("Error en comprovar oportunitats existents.");
  }

  // 3. Creació (si no n'hi ha)
  if (!existingOpportunities || existingOpportunities.length === 0) {
    
    const newOpportunity: DbTableInsert<'opportunities'> = {
      team_id: teamId,
      user_id: userId,
      contact_id: contactId,
      name: `Oportunitat: ${contactName}`,
      source: "Email enviat",
      value: 0,
      
      // ✅ ASSIGNACIÓ CORRECTA
      pipeline_stage_id: stageIdToAssign, // L'ID numèric de l'etapa
      stage_name: enumStageNameToAssign,  // L'ENUM (p.ex. "Contactat")
    };

    const { error: insertError } = await supabase
      .from("opportunities")
      .insert(newOpportunity);

    if (insertError) {
      console.error("Error creant l'oportunitat (service):", insertError);
      throw new Error("No s'ha pogut crear la nova oportunitat.");
    }
  }
}