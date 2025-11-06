"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import * as opportunityService from "@/lib/services/crm/pipeline/opportunities.service";

/**
 * ACCIÓ: Desa (crea o actualitza) una oportunitat.
 */
export async function saveOpportunityAction(formData: FormData) {
  const session = await validateUserSession();
  if ('error' in session) return { error: session.error };
  const { supabase, user, activeTeamId } = session;

  try {
    await opportunityService.saveOpportunity(
      supabase,
      formData,
      user.id,
      activeTeamId
    );
    
    revalidatePath("/crm/pipeline");
    return { success: true };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}

/**
 * ACCIÓ: Actualitza l'etapa d'una oportunitat (per Drag-n-Drop).
 */
export async function updateOpportunityStageAction(opportunityId: number, newStageId: number) {
  const session = await validateUserSession();
  if ('error' in session) return { error: session.error };
  const { supabase, activeTeamId } = session;

  try {
    await opportunityService.updateOpportunityStage(
      supabase,
      opportunityId,
      newStageId,
      activeTeamId
    );

    revalidatePath("/crm/pipeline");
    return { success: true };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}

/**
 * ✅ NOVA ACCIÓ: Elimina una oportunitat.
 */
export async function deleteOpportunityAction(opportunityId: number) {
  const session = await validateUserSession();
  if ('error' in session) return { error: session.error };
  const { supabase, activeTeamId } = session;

  try {
    await opportunityService.deleteOpportunity(
      supabase,
      opportunityId,
      activeTeamId
    );
    
    revalidatePath("/crm/pipeline");
    return { success: true };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}