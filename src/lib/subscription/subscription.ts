import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PLAN_IDS,
  PLAN_LIMITS,
  type PlanId,
  type PlanLimit,
} from '@/config/subscriptions'; // O @/config/subscriptions
import { validatePageSession } from "@/lib/supabase/session";
import { getUserTeamContext } from "@/lib/supabase/teamContext";
/**
 * [DEPRECATED] Aquesta funció ja no és necessària.
 * La lògica ara està dins de getUserTeamContext.
 * export async function getActivePlan(...)
 */

/**
 * Obté el límit numèric per a una característica.
 * ✅ Aquesta funció ara és SÍNCRONA.
 * Rep el planId directament.
 */
export function getPlanLimit(
  planId: PlanId,
  limit: PlanLimit
): number {
  const limits = PLAN_LIMITS[planId] || PLAN_LIMITS[PLAN_IDS.FREE];
  return limits[limit] ?? 0;
}

/**
 * Tipus per al resultat de la comprovació de límit.
 */
export type UsageCheckResult = {
  allowed: boolean;
  current: number;
  max: number;
  error?: string;
};

/**
 * Comprova si un equip pot crear un nou recurs.
 * ✅ Aquesta funció ara és més simple. Rep el planId directament
 * i només s'encarrega de FER EL RECOMPTE.
 */
export async function checkUsageLimit(
  supabase: SupabaseClient,
  teamId: string,
  limit: PlanLimit,
  planId: PlanId // <-- Rep el planId obtingut del context!
): Promise<UsageCheckResult> {
  
  // 1. Obtenim el límit (crida síncrona, 0 cost)
  const max = getPlanLimit(planId, limit);

  // 2. Comprovem si és il·limitat
  if (max === Infinity) {
    return { allowed: true, current: -1, max: Infinity }; // -1 = no comptat
  }

  let current = 0;
  let errorMessage = 'Has assolit el límit del teu pla.';

  // 3. Fem el recompte (Aquest switch és perfecte, no canvia)
  try {
    switch (limit) {
      case 'maxTickets':
        const { count: ticketCount } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId);
        current = ticketCount || 0;
        errorMessage = 'Has assolit el límit de tickets per al teu pla.';
        break;

      case 'maxContacts':
        const { count: contactCount } = await supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId);
        current = contactCount || 0;
        errorMessage = 'Has assolit el límit de contactes per al teu pla.';
        break;

      case 'maxTeamMembers':
        const { count: memberCount } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId);
        current = memberCount || 0;
        errorMessage = 'Has assolit el límit de membres d\'equip per al teu pla.';
        break;

      default:
        // Aquesta és la millora de robustesa que vam comentar
        throw new Error(
          `[UsageLimit] Lògica de recompte no implementada per al límit: ${limit}`
        );
    }
  } catch (error) {
    console.error(`Error checking usage for ${limit}:`, error);
    if (error instanceof Error && error.message.startsWith('[UsageLimit]')) {
      throw error; // Propaguem l'error de desenvolupament
    }
    return {
      allowed: false,
      current: 0,
      max: 0,
      error: 'Error en verificar el límit.',
    };
  }

  // 4. Retornem el resultat
  if (current >= max) {
    return { allowed: false, current, max, error: errorMessage };
  }

  return { allowed: true, current, max };
}

/**
 * Funció d'alt nivell per obtenir l'estat d'ús d'un límit per a l'usuari actual.
 * * Centralitza la lògica de:
 * 1. Validar la sessió de l'usuari.
 * 2. Obtenir el seu equip actiu i el seu pla (via getUserTeamContext).
 * 3. Comprovar l'ús actual contra el límit del pla (via checkUsageLimit).
 * * @param limitType El tipus de límit a comprovar (ex: 'maxContacts', 'maxTickets').
 * @returns Un objecte UsageCheckResult amb l'estat del límit.
 */
export async function getUsageLimitStatus(
  limitType: PlanLimit // ✅ 2. Utilitzem el tipus correcte 'PlanLimit'
): Promise<UsageCheckResult> {
  
  // 1. Validem la sessió
  const session = await validatePageSession();
  if ('error' in session) {
    console.error("getUsageLimitStatus: Sessió invàlida", session.error);
    return { allowed: false, current: 0, max: 0, error: "Sessió no vàlida" };
  }
  
  const { supabase, user, activeTeamId } = session;

  // 2. Obtenim el context (inclou el planId)
  // Aquesta crida utilitza React.cache, per tant és eficient
  const context = await getUserTeamContext(supabase, user.id, activeTeamId);

  // 3. Cridem la funció de baix nivell 'checkUsageLimit'
  // El planId ja ve validat des de 'getUserTeamContext'
  return checkUsageLimit(
    supabase,
    activeTeamId,
    limitType,
    context.planId 
  );
}