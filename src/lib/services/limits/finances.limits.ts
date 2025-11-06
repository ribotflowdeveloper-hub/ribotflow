import 'server-only';
// Importem la signatura base (suposant que està a team.limits, com a l'exemple)
import type { LimitCheckFunction } from './team.limits';

/**
 * Comprova el límit de maxInvoicesPerMonth
 * Aquest SÍ que utilitza la data d'inici del cicle.
 */
export const checkInvoicesPerMonthLimit: LimitCheckFunction = async (
  supabase,
  teamId,
  _userId,
  startDate, // La data d'inici del cicle
) => {
  const { count, error } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .gte('created_at', startDate); // Filtrem per data de cicle

  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    errorMessage: "Has assolit el límit de factures mensuals.",
  };
};

/**
 * Comprova el límit de maxExpensesPerMonth
 * Aquest SÍ que utilitza la data d'inici del cicle.
 */
export const checkExpensesPerMonthLimit: LimitCheckFunction = async (
  supabase,
  teamId,
  _userId,
  startDate, // La data d'inici del cicle
) => {
  const { count, error } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .gte('created_at', startDate); // Filtrem per data de cicle

  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    errorMessage: "Has assolit el límit de despeses mensuals.",
  };
};

/**
 * Comprova el límit de maxSuppliers
 * Aquest és un recompte TOTAL (no depèn de 'startDate').
 */
export const checkSuppliersLimit: LimitCheckFunction = async (
  supabase,
  teamId,
) => {
  const { count, error } = await supabase
    .from('suppliers')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);
    
  if (error) throw new Error(error.message);
  return {
    current: count || 0,
    errorMessage: "Has assolit el límit de proveïdors.",
  };
};