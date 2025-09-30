import type { SupabaseClient } from "@supabase/supabase-js";

// Aquest objecte defineix totes les accions possibles a la teva plataforma.
export const PERMISSIONS = {
    MANAGE_TEAM: 'manage_team',       // Canviar nom de l'equip, convidar, eliminar membres, canviar rols.
    VIEW_BILLING: 'view_billing',       // Veure pressupostos, factures i subscripcions.
    VIEW_TEAM_STATS: 'view_team_stats',   // Veure estadístiques financeres o globals de l'equip.
    MANAGE_INTEGRATIONS: 'manage_integrations', // Connectar amb Meta, LinkedIn, etc.
} as const;

// Aquest tipus ens ajuda amb l'autocompletat
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Aquí definim quins permisos té cada rol. És la nostra taula de regles.
export const ROLES: Record<string, Permission[]> = {
    owner: [
        PERMISSIONS.MANAGE_TEAM,
        PERMISSIONS.VIEW_BILLING,
        PERMISSIONS.VIEW_TEAM_STATS,
        PERMISSIONS.MANAGE_INTEGRATIONS,
    ],
    admin: [
        PERMISSIONS.MANAGE_TEAM,
        PERMISSIONS.VIEW_BILLING,
        PERMISSIONS.VIEW_TEAM_STATS,
        PERMISSIONS.MANAGE_INTEGRATIONS,
    ],
    member: [
        // De moment, el membre no té cap permís especial.
        // En el futur podries afegir: PERMISSIONS.CREATE_DEALS, etc.
    ],
    // Podries afegir el teu rol 'tecnic' aquí amb els seus permisos específics.
    // tecnic: [ PERMISSIONS.VIEW_TEAM_STATS ], 
};

/**
 * Comprova si un rol té un permís específic.
 */
export const hasPermission = (role: string | undefined | null, permission: Permission): boolean => {
    if (!role) return false;
    return ROLES[role]?.includes(permission) || false;
};

/**
 * Funció d'ajuda que obté el rol d'un usuari en un equip concret.
 */
export async function getUserRoleInTeam(
    supabase: SupabaseClient,
    userId: string,
    teamId: string
): Promise<string | null> {
    const { data: member, error } = await supabase
        .from('team_members')
        .select('role')
        .match({ user_id: userId, team_id: teamId })
        .single();
    
    if (error) return null;
    return member.role;
}

/**
 * Funció d'alt nivell que comprova directament si un usuari té un permís.
 */
export async function checkUserPermission(
    supabase: SupabaseClient,
    userId: string,
    teamId: string,
    permission: Permission
): Promise<boolean> {
    const role = await getUserRoleInTeam(supabase, userId, teamId);
    return hasPermission(role, permission);
}