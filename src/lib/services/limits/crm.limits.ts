// /src/lib/services/limits/crm.limits.ts (FITXER NOU)
import 'server-only';
import type { LimitCheckFunction } from './team.limits'; // Importem la signatura

/**
 * Comprova el límit de maxContacts
 */
export const checkContactsLimit: LimitCheckFunction = async (
  supabase,
  teamId,
) => {
  const { count, error } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);
    
  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    errorMessage: "Has assolit el límit de contactes.",
  };
};

/**
 * Comprova el límit de maxTasks
 */
export const checkTasksLimit: LimitCheckFunction = async (
  supabase,
  teamId,
) => {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);
    
  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    errorMessage: "Has assolit el límit de tasques.",
  };
};

/**
 * Comprova el límit de maxQuotesPerMonth
 * Aquest SÍ que utilitza la data d'inici del cicle.
 */
export const checkQuotesPerMonthLimit: LimitCheckFunction = async (
  supabase,
  teamId,
  _userId,
  startDate, // La data d'inici del cicle
) => {
  const { count, error } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .gte('created_at', startDate);
    
  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    errorMessage: "Has assolit el límit de pressupostos mensuals.",
  };
};

// ... Aquí afegiries checkPipelinesLimit, etc.