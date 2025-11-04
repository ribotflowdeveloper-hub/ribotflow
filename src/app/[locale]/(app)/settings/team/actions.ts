// /app/[locale]/settings/team/actions.ts (FITXER CORREGIT I NET)
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { PERMISSIONS, validateSessionAndPermission, Role } from '@/lib/permissions/permissions';

// ✅ 1. Importem el NOU servei i els seus tipus de retorn
import * as teamService from '@/lib/services/settings/team/team.service';
import type { FormState } from '@/lib/services/settings/team/team.service';

// --- Accions del "Lobby" / Hub ---

export async function createTeamAction(formData: FormData) {
  const teamName = formData.get('teamName') as string;
  if (!teamName || teamName.trim().length < 2) {
    return { success: false, message: "El nom de l'equip és obligatori." };
  }

  const session = await validateUserSession(); // Necessari per al 'auth.uid()' del RPC
  if ('error' in session) return { success: false, message: session.error.message };
  
  const { supabase } = session;
  const result = await teamService.createTeam(supabase, teamName);

  if (result.success) {
    revalidatePath('/settings/team');
    return redirect('/settings/team'); // El redirect es queda aquí
  }
  return result;
}

export async function resolveInvitationAction(token: string) {
  // Aquesta acció és pública, no necessita sessió
  const { redirectUrl } = await teamService.resolveInvitation(token);
  return redirect(redirectUrl);
}

export async function acceptInviteAction(token: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect(`/login?invite_token=${token}&message=Has d'iniciar sessió per acceptar.`);
  }

  const { redirectUrl } = await teamService.acceptInvite(supabase, user, token);
  return redirect(redirectUrl);
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

  // L'RPC 'accept_personal_invitation' utilitza auth.uid(), per això la sessió és suficient
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
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_MEMBERS);
  if ('error' in validation) return { success: false, message: validation.error.message };
  
  const email = formData.get('email') as string;
  const role = formData.get('role') as Role;
  if (!email || !role) return { success: false, message: "Falten l'email o el rol." };
  
  const { user, activeTeamId, supabase } = validation;
  const result = await teamService.inviteUser(supabase, user, activeTeamId, email, role);
  
  if (result.success) {
    revalidatePath('/settings/team');
  }
  return result;
}

export async function revokeInvitationAction(invitationId: string): Promise<FormState> {
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
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_ROLES);
  if ('error' in validation) return { success: false, message: validation.error.message };

  const { activeTeamId, supabase } = validation;
  const result = await teamService.updateMemberRole(supabase, activeTeamId, memberUserId, newRole);

  if (result.success) {
    revalidatePath('/settings/team');
  }
  return result;
}

export async function toggleInboxPermissionAction(targetUserId: string): Promise<FormState> {
  const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_ROLES);
  if ('error' in validation) return { success: false, message: validation.error.message };

  const { user: granteeUser, activeTeamId, supabase } = validation;
  const result = await teamService.toggleInboxPermission(supabase, granteeUser, activeTeamId, targetUserId);
  
  if (result.success) {
    revalidatePath('/settings/team');
  }
  return result;
}