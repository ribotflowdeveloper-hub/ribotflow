// Definim explícitament els rols
export const ROLES_LIST = ['owner', 'admin', 'member'] as const;
export type Role = typeof ROLES_LIST[number];

// Definim els permisos de manera granular
export const PERMISSIONS = {
  // --- Equip i Configuració ---
  MANAGE_TEAM_MEMBERS: 'manage_team_members', // Convidar, eliminar, canviar rol (excepte owner)
  MANAGE_TEAM_ROLES: 'manage_team_roles',     // Només 'owner' pot transferir propietat
  MANAGE_TEAM_PROFILE: 'manage_team_profile', // Nom, logo...
  MANAGE_BILLING: 'manage_billing',         // Canviar pla, veure factures
  VIEW_BILLING: 'view_billing',
  MANAGE_INTEGRATIONS: 'manage_integrations', // Connectar Google, etc.
  MANAGE_BLACKLIST: 'manage_blacklist',
  VIEW_BLACKLIST: 'view_blacklist',
  VIEW_TEAM_STATS: 'view_team_stats',

  // --- CRM ---
  VIEW_CONTACTS: 'view_contacts',
  MANAGE_CONTACTS: 'manage_contacts', // Crear, editar, eliminar
  VIEW_PIPELINES: 'view_pipelines',
  MANAGE_PIPELINES: 'manage_pipelines', // Crear, editar, moure oportunitats
  VIEW_CALENDAR: 'view_calendar',
  MANAGE_CALENDAR: 'manage_calendar',
  VIEW_TASKS: 'view_tasks',
  MANAGE_TASKS: 'manage_tasks',

  // --- Comunicació ---
  VIEW_INBOX: 'view_inbox',
  MANAGE_INBOX: 'manage_inbox', // Assignar, respondre, tancar tickets
  VIEW_TEMPLATES: 'view_templates',
  MANAGE_TEMPLATES: 'manage_templates',
  VIEW_SOCIAL_PLANNER: 'view_social_planner',
  MANAGE_SOCIAL_PLANNER: 'manage_social_planner', // Programar, aprovar posts
  VIEW_MARKETING: 'view_marketing',
  MANAGE_MARKETING: 'manage_marketing', // Crear campanyes
  VIEW_TRANSLATIONS: 'view_translations',
  MANAGE_TRANSLATIONS: 'manage_translations', // Crear, editar traduccions

  // --- Finances ---
  VIEW_FINANCES: 'view_finances', // Veure dashboard financer
  MANAGE_QUOTES: 'manage_quotes', // Crear, enviar, editar pressupostos
  MANAGE_INVOICES: 'manage_invoices', // Crear, enviar, marcar com a pagades
  MANAGE_EXPENSES: 'manage_expenses',
  MANAGE_PRODUCTS: 'manage_products',
  MANAGE_SUPPLIERS: 'manage_suppliers',

} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Mapa de Rols a Permisos (Aquesta és la teva decisió de negoci)
// Aquesta és una proposta conservadora
export const ROLES: Record<Role, Permission[]> = {
  owner: [
    // Tot
    ...Object.values(PERMISSIONS),
  ],
  admin: [
    // Tot excepte canviar pla i transferir propietat (la lògica de 'owner' es fa a part)
    PERMISSIONS.MANAGE_TEAM_MEMBERS,
    PERMISSIONS.MANAGE_TEAM_PROFILE,
    PERMISSIONS.VIEW_BILLING,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.MANAGE_BLACKLIST,
    PERMISSIONS.VIEW_BLACKLIST,
    PERMISSIONS.VIEW_TEAM_STATS,
    
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.MANAGE_CONTACTS,
    PERMISSIONS.VIEW_PIPELINES,
    PERMISSIONS.MANAGE_PIPELINES,
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.MANAGE_CALENDAR,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.MANAGE_TASKS,

    PERMISSIONS.VIEW_INBOX,
    PERMISSIONS.MANAGE_INBOX,
    PERMISSIONS.VIEW_TEMPLATES,
    PERMISSIONS.MANAGE_TEMPLATES,
    PERMISSIONS.VIEW_SOCIAL_PLANNER,
    PERMISSIONS.MANAGE_SOCIAL_PLANNER,
    PERMISSIONS.VIEW_MARKETING,
    PERMISSIONS.MANAGE_MARKETING,

    PERMISSIONS.VIEW_FINANCES,
    PERMISSIONS.MANAGE_QUOTES,
    PERMISSIONS.MANAGE_INVOICES,
    PERMISSIONS.MANAGE_EXPENSES,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.MANAGE_SUPPLIERS,
  ],
  member: [
    // Accés limitat a mòduls operatius
    PERMISSIONS.VIEW_CONTACTS,
    PERMISSIONS.MANAGE_CONTACTS, // Potser només els contactes assignats? (lògica de RLS)
    PERMISSIONS.VIEW_PIPELINES,
    PERMISSIONS.VIEW_CALENDAR,
    PERMISSIONS.MANAGE_CALENDAR,
    PERMISSIONS.VIEW_TASKS,
    PERMISSIONS.MANAGE_TASKS,
    PERMISSIONS.VIEW_INBOX,
    PERMISSIONS.MANAGE_INBOX, // Potser només tickets assignats?
    PERMISSIONS.VIEW_TEMPLATES,
    PERMISSIONS.VIEW_SOCIAL_PLANNER,
    
  ],
};

/**
 * Funció "pura" que comprova si un rol té un permís.
 */
export const hasPermission = (role: Role | undefined | null, permission: Permission): boolean => {
  if (!role) return false;
  // Owner sempre té tots els permisos
  if (role === 'owner') return true;
  return ROLES[role]?.includes(permission) || false;
};