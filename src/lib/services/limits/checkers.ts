// /src/lib/subscription/limit.checkers.ts (FITXER NOU I CORREGIT)
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { PlanLimit } from "@/config/subscriptions";
// ✅ CORRECCIÓ 1: Importem el tipus que faltava
import type {
  LimitCheckFunction,
  LimitCheckResult,
} from "@/lib/services/limits/team.limits";

// Importem TOTS els nostres checkers
import {
  checkTeamMembersLimit,
  checkTeamsLimit,
} from "@/lib/services/limits/team.limits";
import {
  checkContactsLimit,
  checkTasksLimit,
} from "@/lib/services/limits/crm.limits";
import {
  checkEmailTemplatesLimit,
  checkMarketingCampaignsLimit, // ✅ 1. Importem el de campanyes
  checkSocialAccountsLimit,
  checkSocialPostsPerMonthLimit,
  checkTicketsLimit,
} from "@/lib/services/limits/comms.limits";
// ✅ 1. Importem els nous checkers de finances
import {
  checkExpensesPerMonthLimit,
  checkInvoicesPerMonthLimit,
  checkProductsLimit,
  checkQuotesPerMonthLimit,
  checkSuppliersLimit,
} from "@/lib/services/limits/finances.limits";
import { checkAIActionsLimit } from "@/lib/services/limits/ai.limits"; // ✅ 2. Importem el d'IA

// El nostre Registre
export const limitCheckers: Record<PlanLimit, LimitCheckFunction> = {
  // Límits d'Equip
  maxTeams: checkTeamsLimit,
  maxTeamMembers: checkTeamMembersLimit,
  maxStorageMB: notImplemented, // TODO

  // Límits de CRM
  maxContacts: checkContactsLimit,
  maxTasks: checkTasksLimit,

  maxPipelines: notImplemented, // TODO
  maxCalendarAccounts: notImplemented, // TODO

  // Límits de Comunicació
  maxEmailAccounts: notImplemented, // TODO
  maxTickets: checkTicketsLimit,
  maxEmailTemplates: checkEmailTemplatesLimit, // TODO
  maxSocialAccounts: checkSocialAccountsLimit,
  maxSocialPostsPerMonth: checkSocialPostsPerMonthLimit,
  maxMarketingCampaignsPerMonth: checkMarketingCampaignsLimit, // ✅ 3. AFEGIT

  // Límits de Finances
  maxInvoicesPerMonth: checkInvoicesPerMonthLimit,
  maxExpensesPerMonth: checkExpensesPerMonthLimit, // TODO
  maxSuppliers: checkSuppliersLimit, // <-- Substituïm 'notImplemented'
  maxProducts: checkProductsLimit, // TODO
  maxQuotesPerMonth: checkQuotesPerMonthLimit,

  // Límits d'IA
  maxAIActionsPerMonth: checkAIActionsLimit,
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
  throw new Error(
    `[UsageLimit] La lògica de recompte per a aquest límit encara no està implementada.`,
  );
}
