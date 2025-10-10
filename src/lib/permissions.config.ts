// /src/lib/permissions.config.ts  (AQUEST ÉS EL FITXER UNIVERSAL I SEGUR)

// Definim explícitament els rols per a més seguretat de tipus.
export const ROLES_LIST = ['owner', 'admin', 'member'] as const;
export type Role = typeof ROLES_LIST[number];

// Definim els permisos de manera granular i clara.
export const PERMISSIONS = {
    MANAGE_TEAM_MEMBERS: 'manage_team_members',
    MANAGE_TEAM_ROLES: 'manage_team_roles',
    MANAGE_TEAM_PROFILE: 'manage_team_profile',
    VIEW_BILLING: 'view_billing',
    MANAGE_BILLING: 'manage_billing',
    VIEW_BLACKLIST: 'view_blacklist',
    MANAGE_BLACKLIST: 'manage_blacklist',
    VIEW_TEAM_STATS: 'view_team_stats',
    MANAGE_INTEGRATIONS: 'manage_integrations',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// El nostre mapa de rols a permisos, 100% tipat.
export const ROLES: Record<Role, Permission[]> = {
    owner: [
        PERMISSIONS.MANAGE_TEAM_MEMBERS,
        PERMISSIONS.MANAGE_TEAM_ROLES,
        PERMISSIONS.MANAGE_TEAM_PROFILE,
        PERMISSIONS.VIEW_BILLING,
        PERMISSIONS.MANAGE_BILLING,
        PERMISSIONS.VIEW_BLACKLIST,
        PERMISSIONS.MANAGE_BLACKLIST,
        PERMISSIONS.VIEW_TEAM_STATS,
        PERMISSIONS.MANAGE_INTEGRATIONS,
    ],
    admin: [
        PERMISSIONS.MANAGE_TEAM_MEMBERS,
        PERMISSIONS.MANAGE_TEAM_ROLES,
        PERMISSIONS.MANAGE_TEAM_PROFILE,
        PERMISSIONS.VIEW_BILLING,
        PERMISSIONS.MANAGE_BILLING,
        PERMISSIONS.VIEW_BLACKLIST,
        PERMISSIONS.MANAGE_BLACKLIST,
        PERMISSIONS.VIEW_TEAM_STATS,
        PERMISSIONS.MANAGE_INTEGRATIONS,
    ],
    member: [
        PERMISSIONS.VIEW_BLACKLIST,
    ],
};

/**
 * Funció "pura" que comprova si un rol té un permís.
 * És segura per a ser executada a client i servidor.
 */
export const hasPermission = (role: Role | undefined | null, permission: Permission): boolean => {
    if (!role) return false;
    return ROLES[role]?.includes(permission) || false;
};