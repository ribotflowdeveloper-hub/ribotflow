// /src/lib/services/limits/team.limits.ts (FITXER NOU I CORREGIT)
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
// ❌ 'PlanLimit' eliminat, no es feia servir
import type { UsageCheckResult } from '@/lib/subscription/subscription'; 
import type { Database } from '@/types/supabase'; // Importem Database per al tipatge de Supabase

// ✅ CORRECCIÓ 1: La funció ha de retornar 'current' i 'error'
export type LimitCheckResult = Promise<Pick<UsageCheckResult, 'current' | 'error'>>;

// Definim una signatura comuna per a tots els "checkers"
export type LimitCheckFunction = (
  supabase: SupabaseClient<Database>, // Tipem SupabaseClient
  teamId: string,
  userId: string,
  startDate: string
) => LimitCheckResult; 

/**
 * Comprova el límit de maxTeams
 * Aquest és un límit d'USUARI, per això ignora el teamId i startDate
 */
export const checkTeamsLimit: LimitCheckFunction = async (
  supabase,
  _teamId, // Ignorat
  userId,
  _startDate, // Ignorat
) => {
  const { count, error } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'owner');
  
  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    // ✅ CORRECCIÓ 2: La propietat es diu 'error'
    error: "Has assolit el límit d'equips que pots posseir.", 
  };
};

/**
 * Comprova el límit de maxTeamMembers
 */
export const checkTeamMembersLimit: LimitCheckFunction = async (
  supabase,
  teamId,
  _userId, // Ignorat
  _startDate, // Ignorat
) => {
  const { count, error } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);
    
  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    // ✅ CORRECCIÓ 3: La propietat es diu 'error'
    error: "Has assolit el límit de membres d'equip.", 
  };
};