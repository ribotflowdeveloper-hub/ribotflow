// /src/config/subscriptions.ts (FITXER COMPLET I CORREGIT)
import { Infinity } from '@/lib/utils/utils';

// IDs dels plans
export const PLAN_IDS = {
  FREE: 'plan_free',
  PRO: 'plan_pro',
  PREMIUM: 'plan_premium',
} as const;

export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS] | 'custom';

// --- LÍMITS DE QUANTITAT (Basats en l'Excel i Unificats) ---
// TOTS els plans han de tenir les MATEIXES claus. Fem servir 'Infinity' si és il·limitat.

const baseLimits = {
  // Equip i Usuaris
  maxTeams: 1,
  maxTeamMembers: 1,
  maxStorageMB: 500,
  // CRM
  maxContacts: 10, //100
  maxPipelines: 5,
  maxQuotesPerMonth: 1,
  maxProducts: 10,
  maxCalendarAccounts: 1,
  maxTasks: 5,
  // Comunicació
  maxEmailAccounts: 1,
  maxTickets: 150,
  maxEmailTemplates: 3,
  maxSocialAccounts: 1,
  maxSocialPostsPerMonth: 2,
  maxMarketingCampaignsPerMonth: 1,
  // Finances
  maxInvoicesPerMonth: 15,
  maxExpensesPerMonth: 15,
  maxSuppliers: 10,
  // IA
  maxAIActionsPerMonth: 5,
};

export const PLAN_LIMITS = {
  [PLAN_IDS.FREE]: {
    ...baseLimits,
  },
  [PLAN_IDS.PRO]: {
    ...baseLimits, // Comencem amb els límits base
    // I sobreescrivim els que són diferents
    maxTeams: Infinity,
    maxTeamMembers: 3,
    maxStorageMB: 10 * 1024, // 10 GB
    maxContacts: 20,//300
    maxPipelines: 15,
    maxQuotesPerMonth: 60,
    maxProducts: Infinity,
    maxCalendarAccounts: Infinity, // TODO: Lògica "per usuari"
    maxTasks: Infinity,
    maxEmailAccounts: Infinity, // TODO: Lògica "per usuari"
    maxTickets: Infinity,
    maxEmailTemplates: 20,
    maxSocialAccounts: 5,
    maxSocialPostsPerMonth: 8,
    maxMarketingCampaignsPerMonth: 10,
    maxInvoicesPerMonth: Infinity,
    maxExpensesPerMonth: Infinity,
    maxSuppliers: Infinity,
    maxAIActionsPerMonth: 100,
  },
  [PLAN_IDS.PREMIUM]: {
    ...baseLimits, // Comencem amb els límits base
    // I sobreescrivim TOTS a 'Infinity' (o el valor premium)
    maxTeams: Infinity,
    maxTeamMembers: Infinity,
    maxStorageMB: 50 * 1024, // 50 GB
    maxContacts: Infinity,
    maxPipelines: Infinity,
    maxQuotesPerMonth: Infinity,
    maxProducts: Infinity,
    maxCalendarAccounts: Infinity,
    maxTasks: Infinity,
    maxEmailAccounts: Infinity,
    maxTickets: Infinity,
    maxEmailTemplates: Infinity,
    maxSocialAccounts: Infinity,
    maxSocialPostsPerMonth: Infinity,
    maxMarketingCampaignsPerMonth: Infinity,
    maxInvoicesPerMonth: Infinity,
    maxExpensesPerMonth: Infinity,
    maxSuppliers: Infinity,
    maxAIActionsPerMonth: 500,
  },
  // 'custom' hauria de ser una còpia del premium
  custom: {
    ...baseLimits,
    maxTeams: Infinity,
    maxTeamMembers: Infinity,
    maxStorageMB: Infinity,
    maxContacts: Infinity,
    maxPipelines: Infinity,
    maxQuotesPerMonth: Infinity,
    maxProducts: Infinity,
    maxCalendarAccounts: Infinity,
    maxTasks: Infinity,
    maxEmailAccounts: Infinity,
    maxTickets: Infinity,
    maxEmailTemplates: Infinity,
    maxSocialAccounts: Infinity,
    maxSocialPostsPerMonth: Infinity,
    maxMarketingCampaignsPerMonth: Infinity,
    maxInvoicesPerMonth: Infinity,
    maxExpensesPerMonth: Infinity,
    maxSuppliers: Infinity,
    maxAIActionsPerMonth: Infinity,
  }
};

// --- PERMISOS DE PLA (Feature Flags) ---

const baseFeatures = {
  hasRoleManagement: false,
};

export const PLAN_FEATURES = {
  [PLAN_IDS.FREE]: {
    ...baseFeatures,
  },
  [PLAN_IDS.PRO]: {
    ...baseFeatures,
    hasRoleManagement: true,
  },
  [PLAN_IDS.PREMIUM]: {
    ...baseFeatures,
    hasRoleManagement: true,
  },
  custom: {
    ...baseFeatures,
    hasRoleManagement: true,
  }
};

// Tipus per assegurar que només demanem límits i features que existeixen
// Ara 'PlanLimit' es basa en 'baseLimits', que conté totes les claus
export type PlanLimit = keyof typeof baseLimits;
export type PlanFeature = keyof typeof baseFeatures;