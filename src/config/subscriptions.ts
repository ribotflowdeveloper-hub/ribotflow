// IDs dels plans (idealment, que coincideixin amb els IDs de Stripe/Supabase)
export const PLAN_IDS = {
  FREE: 'plan_free',
  PRO: 'plan_pro',
  PREMIUM: 'plan_premium',

} as const;

export type PlanId = (typeof PLAN_IDS)[keyof typeof PLAN_IDS];

// Definim els límits de manera centralitzada
export const PLAN_LIMITS = {
  [PLAN_IDS.FREE]: {
    maxTickets: 200,
    maxContacts: 15,
    maxTeamMembers: 3,
  },
  [PLAN_IDS.PRO]: {
    maxTickets: 10000,
    maxContacts: 20,
    maxTeamMembers: 25,
  },
  [PLAN_IDS.PREMIUM]: {
    // Usem Infinity (o null) per a il·limitat
    maxTickets: Infinity,
    maxContacts: Infinity,
    maxTeamMembers: Infinity,
  },
};

// Un tipus per assegurar que només demanem límits que existeixen
export type PlanLimit = keyof (typeof PLAN_LIMITS)[PlanId];