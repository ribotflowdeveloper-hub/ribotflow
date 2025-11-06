// /app/[locale]/(app)/comunicacio/marketing/actions.ts (FITXER COMPLET I BLINDAT)
"use server";

import { revalidatePath } from "next/cache";
import { marketingService } from "@/lib/services/comunicacio/marketing.service";
import type { Campaign, Strategy } from "@/types/comunicacio/marketing";
import { createAdminClient as createSupabaseAdminClient} from "@/lib/supabase/admin";
// ✅ 1. Importem els GUARDIANS
import {
  PERMISSIONS,
  validateActionAndUsage,
  validateSessionAndPermission,
} from "@/lib/permissions/permissions";

/**
 * Helper intern per registrar una acció d'IA.
 * Aquesta funció utilitza el SERVICE_ROLE per saltar-se la RLS
 * i inserir a la taula 'ai_usage_log'.
 */
async function logAIAction(teamId: string, userId: string, actionType: string) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const { error } = await supabaseAdmin
      .from("ai_usage_log")
      .insert({ team_id: teamId, user_id: userId, action_type: actionType });
    if (error) throw error;
  } catch (err) {
    console.error(
      `[logAIAction] No s'ha pogut registrar l'ús d'IA:`,
      (err as Error).message,
    );
    // No aturem l'execució, però ho registrem
  }
}

/**
 * ACCIÓ: Genera idees d'estratègies de màrqueting.
 */
export async function generateStrategiesAction(
  goal: string,
): Promise<{ data: Strategy[] | null; error: string | null }> {
  if (!goal) {
    return { data: null, error: "L'objectiu no pot estar buit." };
  }

  // ✅ 2. VALIDACIÓ 3-EN-1 (Sessió + Rol + Límit d'IA)
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_MARKETING, // Ha de tenir permís per gestionar campanyes
    "maxAIActionsPerMonth", // Ha de tenir "monedes" d'IA
  );
  if ("error" in validation) {
    return { data: null, error: validation.error.message };
  }
  const { user, activeTeamId } = validation;

  // 3. Executem l'acció
  const result = await marketingService.generateStrategies(goal);

  // 4. Si té èxit, registrem l'ús d'IA (sense esperar)
  if (result.data) {
    await logAIAction(activeTeamId, user.id, "generate_strategy");
  }

  return result;
}

/**
 * ACCIÓ: Redacta el contingut d'una campanya.
 */
export async function draftContentAction(
  goal: string,
  strategy: Strategy,
): Promise<{ data: string | null; error: string | null }> {
  if (!goal || !strategy) {
    return { data: null, error: "Falten dades per redactar el contingut." };
  }

  // ✅ 3. VALIDACIÓ 3-EN-1 (Sessió + Rol + Límit d'IA)
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_MARKETING,
    "maxAIActionsPerMonth",
  );
  if ("error" in validation) {
    return { data: null, error: validation.error.message };
  }
  const { user, activeTeamId } = validation;

  // 4. Executem l'acció
  const result = await marketingService.draftContent(goal, strategy);

  // 5. Si té èxit, registrem l'ús d'IA
  if (result.data) {
    await logAIAction(activeTeamId, user.id, "draft_content");
  }

  return result;
}

/**
 * ACCIÓ: Desa una nova campanya.
 */
export async function saveCampaignAction(
  campaignData: Partial<Campaign>,
  goal: string,
) {
  // ✅ 4. VALIDACIÓ 3-EN-1 (Sessió + Rol + Límit de CAMPANYES)
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_MARKETING,
    "maxMarketingCampaignsPerMonth",
  );

  if ("error" in validation) {
    return { data: null, error: validation.error.message };
  }

  const { supabase, user, activeTeamId } = validation;

  const { data, error } = await marketingService.saveCampaign(
    supabase,
    activeTeamId,
    user.id,
    campaignData,
    goal,
  );

  if (error) {
    console.error("Error en desar la campanya (Service):", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/comunicacio/marketing");
  return { data, error: null };
}

/**
 * ACCIÓ: Actualitza una campanya.
 */
export async function updateCampaignAction(
  campaignId: string,
  name: string,
  content: string,
) {
  // ✅ 5. VALIDACIÓ 2-EN-1 (Sessió + Rol)
  // Per actualitzar, no cal comprovar el límit, només el permís de rol.
  const validation = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_MARKETING,
  );
  if ("error" in validation) {
    return { data: null, error: validation.error.message };
  }

  const { supabase, activeTeamId } = validation;

  const { error } = await marketingService.updateCampaign(
    supabase,
    campaignId,
    { name, content },
    activeTeamId,
  );

  if (error) {
    console.error("Error en actualitzar la campanya (Service):", error);
    return { error: error.message };
  }

  revalidatePath("/comunicacio/marketing");
  return { error: null };
}
