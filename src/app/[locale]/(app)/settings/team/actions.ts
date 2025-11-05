// /src/app/[locale]/(app)/settings/team/actions.ts (FITXER COMPLET I REFORÇAT)
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";

// ✅ 1. Importem TOTS els nostres guardians i helpers
import {
  PERMISSIONS,
  validateSessionAndPermission,
  validateActionAndUsage, // El guardià de LÍMITS + ROLS
  validateSessionAndFeature, // El guardià de FEATURE FLAGS
  type Role,
} from '@/lib/permissions/permissions';

// ✅ 2. Importem el servei i els tipus
import * as teamService from '@/lib/services/settings/team/team.service';
import type { FormState } from '@/lib/services/settings/team/team.service';

// --- Accions del "Lobby" / Hub ---

export async function createTeamAction(formData: FormData): Promise<FormState> {
  const teamName = formData.get('teamName') as string;
  if (!teamName || teamName.trim().length < 2) {
    return { success: false, message: "El nom de l'equip és obligatori." };
  }

  // Validem la sessió de l'usuari
  const sessionValidation = await validateUserSession();
  if ('error' in sessionValidation) {
    return { success: false, message: sessionValidation.error.message };
  }
  
  // TODO: Validar el límit 'maxTeams'.
  // La UI ho bloqueja, però la Server Action encara no està 100% blindada.
  // Necessitaríem una funció 'getUsageLimitStatusForUser' que no depengui d'un 'activeTeamId'.

  const { supabase } = sessionValidation;
  const result = await teamService.createTeam(supabase, teamName);

  if (result.success) {
    revalidatePath('/settings/team');
    return redirect('/settings/team');
  }
  return result;
}

export async function switchActiveTeamAction(teamId: string): Promise<FormState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "Usuari no autenticat." };

  const result = await teamService.switchActiveTeam(supabase, user, teamId);
  if (result.success) {
    revalidatePath('/', 'layout');
  }
  return result;
}

export async function clearActiveTeamAction(): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };

  const result = await teamService.clearActiveTeam(session.user);
  if (result.success) {
    revalidatePath('/settings/team', 'page');
  }
  return result;
}

export async function acceptPersonalInviteAction(invitationId: string): Promise<FormState> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Has d'iniciar sessió per a acceptar una invitació." };
  }

  const result = await teamService.acceptPersonalInvite(supabase, invitationId);
  if (result.success) {
    revalidatePath('/settings/team');
  }
  return result;
}

export async function declinePersonalInviteAction(invitationId: string): Promise<FormState> {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };

  const result = await teamService.declinePersonalInvite(session.supabase, session.user, invitationId);
  if (result.success) {
    revalidatePath('/settings/team');
  }
  return result;
}


// --- Accions del Panell de Gestió de l'Equip ---

export async function inviteUserAction(formData: FormData): Promise<FormState> {
  // ✅ 3. VALIDACIÓ DEFINITIVA (Rol + Límit)
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_TEAM_MEMBERS, // Té el ROL per convidar?
    'maxTeamMembers'                 // El PLA té espai?
  );

  if ('error' in validation) {
    return { success: false, message: validation.error.message };
  }
  
  const email = formData.get('email') as string;
  const role = formData.get('role') as Role;
  if (!email || !role) return { success: false, message: "Falten l'email o el rol." };
  
  // Validació addicional del Feature Flag si intenten convidar un Admin
  if (role === 'admin') {
    const featureValidation = await validateSessionAndFeature('hasRoleManagement');
    if ('error' in featureValidation) {
      return { success: false, message: "El teu pla no permet convidar usuaris com a 'admin'." };
    }
  }

  const { user, activeTeamId, supabase } = validation;
  // Cridem el servei NOMÉS si totes les validacions han passat
  const result = await teamService.inviteUser(supabase, user, activeTeamId, email, role);
  
  if (result.success) {
    revalidatePath('/settings/team');
  }
  return result;
}

export async function revokeInvitationAction(invitationId: string): Promise<FormState> {
  // Només validació de ROL
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_MEMBERS);
  if ('error' in validation) return { success: false, message: validation.error.message };

  const { activeTeamId, supabase } = validation;
  const result = await teamService.revokeInvitation(supabase, activeTeamId, invitationId);
  
  if (result.success) {
    revalidatePath('/settings/team');
  }
  return result;
}

export async function removeMemberAction(userIdToRemove: string): Promise<FormState> {
  // Només validació de ROL
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_MEMBERS);
  if ('error' in validation) return { success: false, message: validation.error.message };

  const { user: actionUser, activeTeamId, supabase } = validation;
  const result = await teamService.removeMember(supabase, activeTeamId, actionUser, userIdToRemove);

  if (result.success) {
    revalidatePath('/settings/team');
  }
  return result;
}

export async function updateMemberRoleAction(memberUserId: string, newRole: Role): Promise<FormState> {
  // ✅ 4. VALIDACIÓ DOBLE (Rol + Feature Flag)
  
  // Pas A: Validem ROL
  const rbacValidation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_ROLES);
  if ('error' in rbacValidation) {
    return { success: false, message: rbacValidation.error.message };
  }

  // Pas B: Validem PLA
  const featureValidation = await validateSessionAndFeature('hasRoleManagement');
  if ('error' in featureValidation) {
    return { success: false, message: featureValidation.error.message };
  }

  const { activeTeamId, supabase } = rbacValidation;
  const result = await teamService.updateMemberRole(supabase, activeTeamId, memberUserId, newRole);

  if (result.success) {
    revalidatePath('/settings/team');
  }
  return result;
}

export async function toggleInboxPermissionAction(targetUserId: string): Promise<FormState> {
  // Validació DOBLE (Rol + Feature Flag)
  
  // Pas A: Validem ROL
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_ROLES);
  if ('error' in validation) return { success: false, message: validation.error.message };
  
  // Pas B: Validem PLA
  const featureValidation = await validateSessionAndFeature('hasRoleManagement');
   if ('error' in featureValidation) {
    return { success: false, message: "La gestió de permisos d'Inbox no està inclosa al teu pla." };
  }

  const { user: granteeUser, activeTeamId, supabase } = validation;
  const result = await teamService.toggleInboxPermission(supabase, granteeUser, activeTeamId, targetUserId);
  
  if (result.success) {
    revalidatePath('/settings/team');
  }
  return result;
}