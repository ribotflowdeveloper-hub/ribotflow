// /src/lib/permissions.ts (FITXER COMPLET I CORREGIT)
import 'server-only';
import {
  validateUserSession,
  type ValidatedSession,
  type SessionError,
} from '../supabase/session';
import {
  hasPermission,
  type Permission,
} from './permissions.config';
import {
  isFeatureEnabled,
  getUsageLimitStatus, // ✅ Correcte
} from '../subscription/subscription';
import{ PlanLimit, PlanFeature} from '@/config/subscriptions';
import {
  getUserTeamContext,
  type UserTeamContext,
} from '../supabase/teamContext';

export * from './permissions.config';

type ValidatedSessionWithContext = ValidatedSession & {
  context: UserTeamContext;
};

/**
 * Guardià 1: Comprova Sessió + Permís de Rol (RBAC)
 */
export async function validateSessionAndPermission(
  requiredPermission: Permission
): Promise<ValidatedSessionWithContext | SessionError> {
  
  const sessionValidation = await validateUserSession();
  if ('error' in sessionValidation) return sessionValidation;
  const { supabase, user, activeTeamId } = sessionValidation;

  const context = await getUserTeamContext(supabase, user.id, activeTeamId);

  if (!hasPermission(context.role, requiredPermission)) {
    return {
      error: { message: 'No tens permisos per a realitzar aquesta acció.' },
    };
  }

  return { supabase, user, activeTeamId, context };
}

/**
 * Guardià 2: Comprova Sessió + Permís de Pla (Feature Flag)
 */
export async function validateSessionAndFeature(
  requiredFeature: PlanFeature
): Promise<ValidatedSessionWithContext | SessionError> {

  const sessionValidation = await validateUserSession();
  if ('error' in sessionValidation) return sessionValidation;
  const { supabase, user, activeTeamId } = sessionValidation;
  const context = await getUserTeamContext(supabase, user.id, activeTeamId);

  if (!isFeatureEnabled(context.planId, requiredFeature)) {
     return {
      error: { message: 'El teu pla actual no inclou aquesta funcionalitat.' },
    };
  }
  
  return { supabase, user, activeTeamId, context };
}

/**
 * Guardià 3: El Guardià Definitiu (Sessió + Rol + Pla + Límit)
 */
export async function validateActionAndUsage(
  requiredPermission: Permission,
  limitToCheck: PlanLimit
): Promise<ValidatedSessionWithContext | SessionError> {
  
  const permissionValidation = await validateSessionAndPermission(requiredPermission);
  if ('error' in permissionValidation) return permissionValidation;
  
  const { supabase, user, activeTeamId, context } = permissionValidation;

  // ✅ Correcte: Crida a la funció d'alt nivell
  const usageCheck = await getUsageLimitStatus(limitToCheck);

  if (!usageCheck.allowed) {
    return {
      error: { message: usageCheck.error || 'Has assolit el límit del teu pla.' },
    };
  }
  
  return { supabase, user, activeTeamId, context };
}