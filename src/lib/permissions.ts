// /src/lib/permissions.ts (AQUEST FITXER ÉS NOMÉS PER AL SERVIDOR)

import type { SupabaseClient } from "@supabase/supabase-js";
import { validateUserSession, type ValidatedSession, type SessionError } from './supabase/session';

// ✅ Importem les definicions i helpers universals des del nou fitxer de configuració.
import { 
    hasPermission, 
    type Role, 
    type Permission 
} from './permissions.config'; 
export * from './permissions.config'; // Re-exportem tot per a facilitar les importacions

/**
 * Obté el rol d'un usuari en un equip. Aquesta funció necessita la BD,
 * per tant, es considera una funció de servidor.
 */
export async function getUserRoleInTeam(
    supabase: SupabaseClient,
    userId: string,
    teamId: string
): Promise<Role | null> {
    const { data: member } = await supabase
        .from('team_members')
        .select('role')
        .match({ user_id: userId, team_id: teamId })
        .single();
    
    return member?.role as Role | null;
}

// El nostre "guardià de seguretat" per a Server Actions, que depèn del servidor.
type ValidatedSessionWithRole = ValidatedSession & { userRole: Role };

export async function validateSessionAndPermission(
    requiredPermission: Permission
): Promise<ValidatedSessionWithRole | SessionError> {
    const sessionValidation = await validateUserSession();
    if ('error' in sessionValidation) return sessionValidation;
    
    const { supabase, user, activeTeamId } = sessionValidation;
    const userRole = await getUserRoleInTeam(supabase, user.id, activeTeamId);

    if (!hasPermission(userRole, requiredPermission)) {
        return { error: { message: "No tens permisos per a realitzar aquesta acció." } };
    }

    return { supabase, user, activeTeamId, userRole: userRole! };
}