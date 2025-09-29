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
 * Funció auxiliar reutilitzable per a comprovar si un rol té un permís.
 * Aquesta serà la funció que farem servir a tot arreu.
 * @param role El rol de l'usuari (ex: 'admin', 'member').
 * @param permission El permís que volem comprovar (ex: 'view_billing').
 * @returns true si el rol té el permís, false si no.
 */
export const hasPermission = (role: string | undefined | null, permission: Permission): boolean => {
    if (!role) return false;
    // Comprovem si el rol existeix i si la seva llista de permisos inclou el que busquem.
    return ROLES[role]?.includes(permission) || false;
};