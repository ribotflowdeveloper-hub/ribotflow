"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { type Database } from "@/types/supabase";

type Pipeline = Database["public"]["Tables"]["pipelines"]["Row"];
type Stage = Database["public"]["Tables"]["pipeline_stages"]["Row"];

/**
 * Revalida totes les rutes afectades per canvis al pipeline.
 */
function revalidatePaths() {
  revalidatePath("/settings/crm/pipelines");
  revalidatePath("/crm/pipeline");
}

/**
 * Acció: Crea un nou pipeline.
 */
export async function createPipelineAction(name: string) {
  const session = await validateUserSession();
  if ("error" in session) return { error: session.error };
  const { supabase, activeTeamId } = session;

  try {
    const { data, error } = await supabase
      .from("pipelines")
      .insert({ name, team_id: activeTeamId })
      .select()
      .single();

    if (error) throw error;

    revalidatePaths();
    return { success: true, data: data as Pipeline };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}

/**
 * Acció: Actualitza el nom d'un pipeline.
 */
export async function updatePipelineNameAction(id: number, newName: string) {
  const session = await validateUserSession();
  if ("error" in session) return { error: session.error };
  const { supabase, activeTeamId } = session;

  try {
    const { error } = await supabase
      .from("pipelines")
      .update({ name: newName })
      .eq("id", id)
      .eq("team_id", activeTeamId); // Control de seguretat RLS

    if (error) throw error;

    revalidatePaths();
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}

/**
 * Acció: Elimina un pipeline (i les seves etapes, per 'ON DELETE CASCADE').
 */
export async function deletePipelineAction(id: number) {
  const session = await validateUserSession();
  if ("error" in session) return { error: session.error };
  const { supabase, activeTeamId } = session;

  try {
    const { error } = await supabase
      .from("pipelines")
      .delete()
      .eq("id", id)
      .eq("team_id", activeTeamId); // Control de seguretat RLS

    if (error) throw error;

    revalidatePaths();
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}

/**
 * Acció: Crea una nova etapa (columna) per a un pipeline específic.
 * ✅ MODIFICAT: Ara accepta 'color'
 */
export async function createStageAction(
  pipelineId: number,
  name: string,
  color: string,
) {
  const session = await validateUserSession();
  if ("error" in session) return { error: session.error };
  const { supabase, activeTeamId, user } = session;
  try {
    const { data: maxPos, error: posError } = await supabase
      .from("pipeline_stages")
      .select("position")
      .eq("pipeline_id", pipelineId)
      .eq("team_id", activeTeamId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    if (posError && posError.code !== "PGRST116") {
      throw posError;
    }
    const newPosition = maxPos ? maxPos.position + 1 : 1;

    // 2. Inserir la nova etapa
    const { data, error } = await supabase
      .from("pipeline_stages")
      .insert({
        pipeline_id: pipelineId,
        name,
        color, // ✅ AFEGIDA LA PROPIETAT COLOR
        position: newPosition,
        team_id: activeTeamId,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePaths();
    return { success: true, data: data as Stage };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}

/**
 * Acció: Actualitza el nom d'una etapa.
 */
export async function updateStageNameAction(id: number, newName: string) {
  const session = await validateUserSession();
  if ("error" in session) return { error: session.error };
  const { supabase, activeTeamId } = session;

  try {
    const { error } = await supabase
      .from("pipeline_stages")
      .update({ name: newName })
      .eq("id", id)
      .eq("team_id", activeTeamId); // Control de seguretat RLS

    if (error) throw error;

    revalidatePaths();
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}

/**
 * Acció: Elimina una etapa.
 */
export async function deleteStageAction(id: number) {
  const session = await validateUserSession();
  if ("error" in session) return { error: session.error };
  const { supabase, activeTeamId } = session;

  try {
    const { error } = await supabase
      .from("pipeline_stages")
      .delete()
      .eq("id", id)
      .eq("team_id", activeTeamId); // Control de seguretat RLS

    if (error) throw error;

    revalidatePaths();
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}

/**
 * Acció: Reordena les etapes (el flux) d'un pipeline.
 */
export async function updateStagesOrderAction(
  stages: Pick<Stage, "id" | "position">[],
) {
  const session = await validateUserSession();
  if ("error" in session) return { error: session.error };
  const { supabase, activeTeamId } = session;

  const updates = stages.map((stage, index) => ({
    id: stage.id,
    position: index + 1,
    team_id: activeTeamId,
  }));

  try {
    const { error } = await supabase
      .from("pipeline_stages")
      .upsert(updates, { onConflict: "id" });

    if (error) throw error;

    revalidatePaths();
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}

/**
 * Acció: Assigna un tipus semàntic (WON/LOST) a una etapa.
 * Assegura que només hi hagi un tipus per pipeline.
 */
// Aquesta acció ja estava preparada per acceptar text,
// però actualitzem el tipus per a TypeScript
export async function setStageTypeAction(
  pipelineId: number,
  stageId: number,
  // ✅ TIPUS ACTUALITZAT
  stageType: 'WON' | 'LOST' | 'PROSPECT' | 'CONTACTED' | 'PROPOSAL'
) {
  const session = await validateUserSession();
  if ('error' in session) return { error: session.error };
  const { supabase, activeTeamId } = session;

  try {
    const { error: transactionError } = await supabase.rpc(
      'set_pipeline_stage_type', 
      {
        p_pipeline_id: pipelineId,
        p_stage_id: stageId,
        p_stage_type: stageType, // El tipus actualitzat es passa aquí
        p_team_id: activeTeamId
      }
    );
    
    if (transactionError) throw transactionError;

    revalidatePath("/settings/crm/pipelines");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}