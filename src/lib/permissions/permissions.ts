import 'server-only';
import {
  validateUserSession,
  type ValidatedSession,
  type SessionError,
} from '../supabase/session'; // Aquest fitxer no canvia

// ✅ Importem les definicions i helpers universals
import {
  hasPermission,
  type Role,
  type Permission,
} from './permissions.config';
export * from './permissions.config'; // Re-exportem

// ✅ Importem la nostra NOVA funció de context
import {
  getUserTeamContext,
  type UserTeamContext,
} from '../supabase/teamContext';

/**
 * [DEPRECATED] Aquesta funció ja no és necessària.
 * La lògica ara està dins de getUserTeamContext.
 * export async function getUserRoleInTeam(...)
 */

// El nostre "guardià de seguretat" per a Server Actions.
// Ara retorna el context complet.
type ValidatedSessionWithContext = ValidatedSession & {
  context: UserTeamContext;
};

export async function validateSessionAndPermission(
  requiredPermission: Permission
): Promise<ValidatedSessionWithContext | SessionError> {
  
  // 1. Validem la sessió (això no canvia)
  // DB Call 1: auth.getUser() (+ fallback a 'profiles' si cal)
  const sessionValidation = await validateUserSession();
  if ('error' in sessionValidation) return sessionValidation;

  const { supabase, user, activeTeamId } = sessionValidation;

  // 2. Obtenim TOT el context (Rol, Pla, etc.) d'UN SOL COP
  // DB Call 2: RPC('get_user_team_context')
  // Aquesta crida està embolicada amb cache()
  const context = await getUserTeamContext(supabase, user.id, activeTeamId);

  // 3. Validem el permís contra el rol del context
  if (!hasPermission(context.role, requiredPermission)) {
    return {
      error: { message: 'No tens permisos per a realitzar aquesta acció.' },
    };
  }

  // 4. Retornem tot
  return { supabase, user, activeTeamId, context };
}