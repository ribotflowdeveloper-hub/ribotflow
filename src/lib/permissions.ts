// /src/lib/permissions.ts

import type { SupabaseClient } from "@supabase/supabase-js";

// Aquest objecte defineix totes les accions possibles a la teva plataforma.
export const PERMISSIONS = {
    MANAGE_TEAM: 'manage_team',
    MANAGE_TEAM_PROFILE: 'manage_team_profile', // ✅ AFEGIT: Permís per editar les dades de l'empresa.
    VIEW_BILLING: 'view_billing',
    MANAGE_BILLING: 'manage_billing', // ✅ AFEGIT: Permís per canviar de pla o cancel·lar.
    VIEW_BLACKLIST: 'view_blacklist', // ✅ AFEGIT: Permís per veure la llista negra.
    MANAGE_BLACKLIST: 'manage_blacklist', // ✅ AFEGIT: Permís per afegir/eliminar regles.
    VIEW_TEAM_STATS: 'view_team_stats',
    MANAGE_INTEGRATIONS: 'manage_integrations',
} as const;

// Aquest tipus ens ajuda amb l'autocompletat
export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Aquí definim quins permisos té cada rol. És la nostra taula de regles.
export const ROLES: Record<string, Permission[]> = {
    owner: [
        PERMISSIONS.MANAGE_TEAM,
        PERMISSIONS.MANAGE_TEAM_PROFILE, // ✅ AFEGIT
        PERMISSIONS.VIEW_BILLING,
        PERMISSIONS.MANAGE_BILLING, // ✅ AFEGIT
        PERMISSIONS.VIEW_BLACKLIST, // ✅ AFEGIT
        PERMISSIONS.MANAGE_BLACKLIST, // ✅ AFEGIT
        PERMISSIONS.VIEW_TEAM_STATS,
        PERMISSIONS.MANAGE_INTEGRATIONS,
    ],
    admin: [
        PERMISSIONS.MANAGE_TEAM,
        PERMISSIONS.MANAGE_TEAM_PROFILE, // ✅ AFEGIT
        PERMISSIONS.VIEW_BILLING,
        PERMISSIONS.MANAGE_BILLING, // ✅ AFEGIT
        PERMISSIONS.VIEW_BLACKLIST, // ✅ AFEGIT
        PERMISSIONS.MANAGE_BLACKLIST, // ✅ AFEGIT
        PERMISSIONS.VIEW_TEAM_STATS,
        PERMISSIONS.MANAGE_INTEGRATIONS,
    ],
    member: [
        // ✅ AFEGIT: Donem permís als membres per veure la llista negra.
        PERMISSIONS.VIEW_BLACKLIST,
    ],
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