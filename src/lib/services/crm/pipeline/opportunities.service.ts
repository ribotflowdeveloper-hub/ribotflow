// src/lib/services/crm/pipeline/opportunities.service.ts (FITXER CORREGIT I COMPLET)
"use server";

import { type SupabaseClient } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import type { DbTableInsert, DbTableUpdate, Opportunity } from "@/types/db";

interface CreateOpportunityParams {
  supabase: SupabaseClient<Database>;
  contactId: number;
  teamId: string;
  userId: string;
  contactName: string;
  pipelineId: number;
}

// --- Funcions existents (sense canvis) ---
export async function getOpportunitiesWithContact(
  supabase: SupabaseClient<Database>,
  teamId: string,
) {
  return supabase
    .from("opportunities")
    .select("*, contacts(id, nom)")
    .eq("team_id", teamId);
}
export async function getOpportunitiesInStages(
  supabase: SupabaseClient<Database>,
  teamId: string,
  stageIds: number[],
) {
  // ✅ AFEGEIX AQUESTA LÍNIA (La Clàusula de Guàrdia)
  if (!stageIds || stageIds.length === 0) {
    return { data: [], error: null };
  }

  return supabase
    .from("opportunities")
    .select("*, contacts(id, nom)")
    .eq("team_id", teamId)
    .in("pipeline_stage_id", stageIds);
}
export async function saveOpportunity(
  supabase: SupabaseClient<Database>,
  formData: FormData,
  userId: string,
  activeTeamId: string,
): Promise<Opportunity> {
  const rawData = Object.fromEntries(formData.entries());
  const contactId = rawData.contact_id
    ? parseInt(rawData.contact_id as string, 10)
    : null;
  const opportunityId = rawData.id ? parseInt(rawData.id as string, 10) : null;
  const closeDateValue = rawData.close_date as string;
  const stageId = rawData.pipeline_stage_id
    ? parseInt(rawData.pipeline_stage_id as string, 10)
    : null;
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
      .update(dataToSave as DbTableUpdate<"opportunities">)
      .eq("id", opportunityId)
      .eq("team_id", activeTeamId);
  } else {
    query = supabase
      .from("opportunities")
      .insert(dataToSave as DbTableInsert<"opportunities">);
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
  activeTeamId: string,
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
  activeTeamId: string,
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
// --- Funció Corregida ---

/**
 * SERVEI: Crea una nova oportunitat per a un contacte si no n'existeix cap d'oberta
 * *en el mateix pipeline*.
 * S'utilitza en enviar un correu des de l'inbox.
 */
export async function createOpportunityFromEmail({
  supabase,
  contactId,
  teamId,
  userId,
  contactName,
  pipelineId,
}: CreateOpportunityParams): Promise<void> {
  // 1. Trobar l'etapa d'assignació (Lògica 'Contactat' o fallback)
  // (Aquesta lògica ja estava bé)

  let stageIdToAssign: number;
  let enumStageNameToAssign:
    | "Nou Lead"
    | "Contactat"
    | "Proposta Enviada"
    | "Negociació"
    | "Guanyat"
    | "Perdut" = "Contactat";

  const { data: contactatStage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("pipeline_id", pipelineId)
    .ilike("name", "Contactat")
    .limit(1)
    .single();

  if (contactatStage) {
    stageIdToAssign = contactatStage.id;
  } else {
    const { data: firstStage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("id, name")
      .eq("pipeline_id", pipelineId)
      .order("position", { ascending: true })
      .limit(1)
      .single();

    if (stageError || !firstStage) {
      throw new Error(
        `El pipeline seleccionat (ID: ${pipelineId}) no té cap etapa configurada.`,
      );
    }
    stageIdToAssign = firstStage.id;

    const validStages = [
      "Nou Lead",
      "Contactat",
      "Proposta Enviada",
      "Negociació",
      "Guanyat",
      "Perdut",
    ];
    if (validStages.includes(firstStage.name)) {
      enumStageNameToAssign = firstStage.name as typeof enumStageNameToAssign;
    } else {
      enumStageNameToAssign = "Nou Lead";
    }
  }

  // 2. ✅ CORRECCIÓ: Comprovació de duplicats
  // Comprovem si ja existeix una oportunitat OBERTA per a aquest contacte
  // DINS D'AQUEST PIPELINE ESPECÍFIC.

  const { data: existingOpportunities, error: checkError } = await supabase
    .from("opportunities")
    // Fem un inner join amb pipeline_stages per poder filtrar
    .select("id, pipeline_stages!inner(pipeline_id, stage_type)")
    .eq("contact_id", contactId)
    .eq("team_id", teamId)
    // ✅ AQUEST ÉS EL FILTRE CLAU:
    // Assegurem que l'etapa pertany al pipeline que hem seleccionat
    .eq("pipeline_stages.pipeline_id", pipelineId)
    // ✅ COMPROVACIÓ ROBUSTA:
    // Mirem el 'stage_type' (no el 'stage_name') per saber si està tancada
    .not("pipeline_stages.stage_type", "in", '("WON", "LOST")')
    .limit(1);

  if (checkError) {
    console.error(
      "Error comprovant oportunitats existents (service):",
      checkError,
    );
    // Compte: si el join falla (p.ex. 'pipeline_stages' no trobat), pot donar error.
    // Assegura't que la relació 'pipeline_stage_id' està ben configurada.
    throw new Error("Error en comprovar oportunitats existents.");
  }

  // 3. Creació (si no n'hi ha cap d'oberta *en aquest pipeline*)
  if (!existingOpportunities || existingOpportunities.length === 0) {
    const newOpportunity: DbTableInsert<"opportunities"> = {
      team_id: teamId,
      user_id: userId,
      contact_id: contactId,
      name: `Oportunitat: ${contactName}`,
      source: "Email enviat",
      value: 0,

      // Assignació (aquesta lògica ja estava bé)
      pipeline_stage_id: stageIdToAssign,
      stage_name: enumStageNameToAssign,
    };

    const { error: insertError } = await supabase
      .from("opportunities")
      .insert(newOpportunity);

    if (insertError) {
      console.error("Error creant l'oportunitat (service):", insertError);
      throw new Error("No s'ha pogut crear la nova oportunitat.");
    }
  }
  // Si ja existeix una oportunitat oberta en aquest pipeline, no fem res.
  // Aquest és el comportament esperat per evitar duplicats.
}
