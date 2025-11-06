// /src/lib/subscription/subscription.ts (FITXER COMPLET I REFACTORITZAT)
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PLAN_FEATURES,
  PLAN_IDS,
  PLAN_LIMITS,
  type PlanFeature,
  type PlanId,
  type PlanLimit,
} from "@/config/subscriptions";
import { validatePageSession } from "@/lib/supabase/session";
import { getUserTeamContext } from "@/lib/supabase/teamContext";
import { Infinity } from "@/lib/utils/utils";
import { limitCheckers } from '@/lib/services/limits/checkers'; // ✅ 1. Importem el nostre nou REGISTRE

/**
 * Obté el límit numèric per a una característica.
 * (No canvia)
 */
export function getPlanLimit(
  planId: PlanId | typeof PLAN_IDS.FREE,
  limit: PlanLimit,
): number {
  const safePlanId = (planId in PLAN_LIMITS) ? planId : PLAN_IDS.FREE;

  const limits = PLAN_LIMITS[safePlanId];
  return limits[limit] ?? 0;
}

/**
 * Comprova si una característica està activada (Feature Flag).
 * (No canvia)
 */
export function isFeatureEnabled(
  planId: PlanId | typeof PLAN_IDS.FREE,
  feature: PlanFeature,
): boolean {
  const safePlanId = (planId in PLAN_FEATURES) ? planId : PLAN_IDS.FREE;

  const features = PLAN_FEATURES[safePlanId];
  return features[feature] ?? false;
}

/**
 * Tipus per al resultat de la comprovació de límit.
 * (No canvia)
 */
export type UsageCheckResult = {
  allowed: boolean;
  current: number;
  max: number;
  error?: string;
};

/**
 * Funció interna que només s'utilitza com a FALLBACK
 * (No canvia)
 */
function getISODate30DaysAgo(): string {
  console.warn(
    "[UsageLimit] Fallback: utilitzant finestra de 30 dies en lloc del cicle de facturació.",
  );
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString();
}

/**
 * ✅ 2. AQUESTA ÉS LA NOVA FUNCIÓ 'checkUsageLimit'
 * Ara és un simple "router" que crida al "checker" correcte.
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  limit: PlanLimit,
  planId: PlanId,
  userId: string,
  teamId: string | null,
  billingCycleStartDate: string,
): Promise<UsageCheckResult> {
  
  const max = getPlanLimit(planId, limit);
  if (max === Infinity) {
    return { allowed: true, current: -1, max: Infinity };
  }

  try {
    // 1. Busquem la funció de recompte correcta al nostre registre
    const checker = limitCheckers[limit];
    if (!checker) {
      throw new Error(`[UsageLimit] Lògica de recompte no implementada per al límit: ${limit}`);
    }

    // 2. Executem la funció específica (ex: checkContactsLimit)
    const { current, error } = await checker(
      supabase,
      teamId!, // Passem el teamId (els checkers que no el necessiten, l'ignoraran)
      userId,
      billingCycleStartDate
    );

    console.log(`[checkUsageLimit] Recompte per '${limit}': ${current} (Max: ${max})`);

    // 3. Comprovem el resultat
    const safeErrorMessage = typeof error === "string" ? error : undefined;
    if (current >= max) {
      return { allowed: false, current, max, error: safeErrorMessage };
    }
    return { allowed: true, current, max };

  } catch (error: unknown) {
    let message: string;
    if (error instanceof Error) { message = error.message; }
    else { message = String(error) || "Error desconegut al comprovar el límit"; }

    console.error(`[checkUsageLimit] Error real per ${limit}:`, message);
    return { allowed: false, current: 0, max: 0, error: message };
  }
}

/**
 * Funció d'alt nivell per obtenir l'estat d'ús d'un límit per a l'usuari actual.
 * ✅ AQUESTA FUNCIÓ ÉS LA MATEIXA QUE TENS ARA. NO CANVIA.
 * Ja fa la lògica de buscar la data del cicle de facturació.
 */
export async function getUsageLimitStatus(
  limitType: PlanLimit
): Promise<UsageCheckResult> {
  
  console.log(`[getUsageLimitStatus] Iniciant comprovació de límit per a: ${limitType}`);
  
  const session = await validatePageSession();
  if ('error' in session) {
    console.error("getUsageLimitStatus: Sessió invàlida", session.error);
    return { allowed: false, current: 0, max: 0, error: "Sessió no vàlida" };
  }
  
  const { supabase, user, activeTeamId } = session;
  const context = await getUserTeamContext(supabase, user.id, activeTeamId);

  console.log(`[getUsageLimitStatus] Context obtingut: PlanID = ${context.planId}, TeamID = ${activeTeamId}`);

  let billingCycleStartDate: string;
  
  if (activeTeamId) {
      const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .select('current_period_start') 
      .eq('team_id', activeTeamId)
      .in('status', ['active', 'trialing']) 
      .maybeSingle();

      if (subError) {
        console.error("[getUsageLimitStatus] Error greu consultant 'subscriptions':", subError.message);
        billingCycleStartDate = getISODate30DaysAgo(); // Fallback
      } else if (subData?.current_period_start) { 
        billingCycleStartDate = new Date(subData.current_period_start).toISOString();
      } else {
        console.warn(`[getUsageLimitStatus] No s'ha trobat 'current_period_start' per a l'equip ${activeTeamId}. Fent fallback.`);
        billingCycleStartDate = getISODate30DaysAgo(); // Fallback
      }
  } else {
    billingCycleStartDate = getISODate30DaysAgo();
  }

  console.log(`[getUsageLimitStatus] Data d'inici del cicle seleccionada: ${billingCycleStartDate}`);

  return checkUsageLimit(
    supabase,
    limitType,
    context.planId, 
    user.id,
    activeTeamId,
    billingCycleStartDate // Passem la data correcta
  );
}

/**
 * Funció d'alt nivell per comprovar un permís de pla (feature flag).
 * (No canvia)
 */
export async function getFeatureFlagStatus(
  featureType: PlanFeature,
): Promise<{ enabled: boolean }> {
  // ... (aquesta funció no canvia) ...
  const session = await validatePageSession();
  if ("error" in session) { return { enabled: false }; }
  const { supabase, user, activeTeamId } = session;
  if (!activeTeamId) { return { enabled: false }; }
  const context = await getUserTeamContext(supabase, user.id, activeTeamId);
  return { enabled: isFeatureEnabled(context.planId, featureType) };
}