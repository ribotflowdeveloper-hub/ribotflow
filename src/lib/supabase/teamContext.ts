import 'server-only';
import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_IDS, type PlanId } from '@/config/subscriptions';
import type { Role } from '../permissions/permissions.config'; // Comprova la ruta
import type { Database } from '@/types/supabase';

// ✅ MILLORA: Definim el tipus que ESPEREM de la funció RPC
// Això ens permet evitar 'as any' i tenir un cast segur.
type RpcContextResponse = {
  role: string | null;
  plan_id: string | null;
  team_name: string | null;
} | null; // L'RPC pot tornar null si hi ha un error

// Tipus per a la resposta del nostre context
export type UserTeamContext = {
  role: Role | null;
  planId: PlanId;
  teamName: string | null;
};

/**
 * Obté tot el context crític de l'usuari i l'equip (rol, pla)
 * en UNA ÚNICA crida a la base de dades (via RPC).
 *
 * Embolicada amb React.cache, es pot cridar múltiples vegades
 * en un mateix cicle de request (Server Components, Server Actions)
 * sense cost addicional.
 */
export const getUserTeamContext = cache(
  async (
    supabase: SupabaseClient<Database>,
    userId: string,
    teamId: string
  ): Promise<UserTeamContext> => {
    
    if (!userId || !teamId) {
      return { role: null, planId: PLAN_IDS.FREE, teamName: null };
    }

    // 1. Cridem la funció RPC
    // Després de regenerar els tipus, 'get_user_team_context' serà vàlid.
    const { data, error } = await supabase.rpc('get_user_team_context', {
      p_user_id: userId,
      p_team_id: teamId,
    });

    // 2. Gestionem errors
    if (error) {
      console.error('Error critical al obtenir user_team_context:', error);
      return { role: null, planId: PLAN_IDS.FREE, teamName: null };
    }

    // 3. Processem la resposta JSON
    // ✅ MILLORA: Fem un cast al nostre tipus definit (RpcContextResponse)
    // en lloc de 'as any'. Això satisfà Eslint i és més segur.
    const contextData = data as RpcContextResponse;

    const planId = (contextData?.plan_id) ?? PLAN_IDS.FREE;
    
    // 4. Validem el planId
    const validPlans = Object.values(PLAN_IDS) as string[];
    const finalPlanId = validPlans.includes(planId)
      ? (planId as PlanId)
      : PLAN_IDS.FREE;

    // 5. Retornem el context net
    return {
      role: (contextData?.role as Role | null) ?? null,
      planId: finalPlanId,
      teamName: contextData?.team_name ?? null,
    };
  }
);