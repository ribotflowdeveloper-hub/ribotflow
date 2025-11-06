"use server";

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import * as opportunityService from "@/lib/services/crm/pipeline/opportunities.service";

/**
 * ACCIÓ: Desa (crea o actualitza) una oportunitat.
 * (Aquesta acció no canvia, ja que el servei 'saveOpportunity' és qui processa el FormData)
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
 * ✅ CORRECCIÓ: 'newStageId' és ara un 'number'.
 */
export async function updateOpportunityStageAction(opportunityId: number, newStageId: number) {
  const session = await validateUserSession();
  if ('error' in session) return { error: session.error };
  const { supabase, activeTeamId } = session;

  try {
    // Passem l'ID numèric al servei
    await opportunityService.updateOpportunityStage(
      supabase,
      opportunityId,
      newStageId, // ✅ ID numèric
      activeTeamId
    );

    revalidatePath("/crm/pipeline");
    return { success: true };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { error: { message } };
  }
}