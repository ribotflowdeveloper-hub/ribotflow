// /src/lib/subscription/limit.checkers.ts (FITXER NOU I CORREGIT)
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { PlanLimit } from '@/config/subscriptions';
// ✅ CORRECCIÓ 1: Importem el tipus que faltava
import type { UsageCheckResult } from '@/lib/subscription/subscription'; 
import type { LimitCheckFunction, LimitCheckResult } from '@/lib/services/limits/team.limits';

// Importem TOTS els nostres checkers
import { checkTeamsLimit, checkTeamMembersLimit } from '@/lib/services/limits/team.limits';
import { checkContactsLimit, checkTasksLimit, checkQuotesPerMonthLimit } from '@/lib/services/limits/crm.limits';
import { checkTicketsLimit, checkSocialAccountsLimit, checkSocialPostsPerMonthLimit } from '@/lib/services/limits/comms.limits';

// El nostre Registre
export const limitCheckers: Record<PlanLimit, LimitCheckFunction> = {
  // Límits d'Equip
  maxTeams: checkTeamsLimit,
  maxTeamMembers: checkTeamMembersLimit,
  maxStorageMB: notImplemented, // TODO

  // Límits de CRM
  maxContacts: checkContactsLimit,
  maxTasks: checkTasksLimit,
  maxQuotesPerMonth: checkQuotesPerMonthLimit,
  maxPipelines: notImplemented, // TODO
  maxProducts: notImplemented, // TODO
  maxCalendarAccounts: notImplemented, // TODO

  // Límits de Comunicació
  maxEmailAccounts: notImplemented, // TODO
  maxTickets: checkTicketsLimit,
  maxEmailTemplates: notImplemented, // TODO
  maxSocialAccounts: checkSocialAccountsLimit,
  maxSocialPostsPerMonth: checkSocialPostsPerMonthLimit,
  maxMarketingCampaignsPerMonth: notImplemented, // TODO

  // Límits de Finances
  maxInvoicesPerMonth: notImplemented, // TODO
  maxExpensesPerMonth: notImplemented, // TODO
  maxSuppliers: notImplemented, // TODO

  // Límits d'IA
  maxAIActionsPerMonth: notImplemented, // TODO
};

/**
 * Funció 'placeholder' per a límits que encara no hem implementat.
 */
async function notImplemented(
  _supabase: SupabaseClient<Database>, // ✅ CORRECCIÓ 2: Tipem 'any'
  _teamId: string,
  _userId: string,
  _startDate: string,
): LimitCheckResult { // ✅ CORRECCIÓ 3: Utilitzem el tipus de retorn correcte
  throw new Error(`[UsageLimit] La lògica de recompte per a aquest límit encara no està implementada.`);
}