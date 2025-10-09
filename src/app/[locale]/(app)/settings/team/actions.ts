"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from 'zod';
import { Resend } from 'resend';

import { createAdminClient } from "@/lib/supabase/server";
import { validateUserSession } from "@/lib/supabase/session";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { User, SupabaseClient } from "@supabase/supabase-js";

// --- Esquemes de Validació amb Zod ---

const CreateTeamSchema = z.object({
  teamName: z.string().min(2, "El nom de l'equip ha de tenir almenys 2 caràcters."),
});

const InviteUserSchema = z.object({
  email: z.string().email("L'adreça d'email no és vàlida."),
  role: z.enum(['admin', 'member'], "El rol seleccionat no és vàlid."),
});

const UpdateRoleSchema = z.object({
    newRole: z.enum(['admin', 'member'], "El nou rol no és vàlid."),
});

// --- Accions de Gestió d'Equips i Membres ---

export async function createTeamAction(formData: FormData) {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, user } = session;

  const validation = CreateTeamSchema.safeParse({ teamName: formData.get('teamName') });
  if (!validation.success) {
    // ✅ CORRECCIÓ: Usem 'issues' en lloc de 'errors'.
    return { success: false, message: validation.error.issues[0].message };
  }

  try {
    const { data: newTeam } = await supabase
      .from('teams')
      .insert({ name: validation.data.teamName, owner_id: user.id })
      .select('id')
      .single()
      .throwOnError();

    await supabase
      .from('team_members')
      .insert({ team_id: newTeam.id, user_id: user.id, role: 'owner' })
      .throwOnError();
    

  } catch {
    return { success: false, message: "Error en crear l'equip." };
  }

  revalidatePath('/settings/team');
  redirect('/settings/team');
}

export async function inviteUserAction(formData: FormData) {
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, user: inviter, activeTeamId } = session;

  const { data: inviterMember } = await supabase.from('team_members').select('role').match({ user_id: inviter.id, team_id: activeTeamId }).single();
  if (!hasPermission(inviterMember?.role, PERMISSIONS.MANAGE_TEAM)) {
      return { success: false, message: "No tens permisos per a convidar usuaris." };
  }

  const validation = InviteUserSchema.safeParse(Object.fromEntries(formData));
  if (!validation.success) {
      return { success: false, message: validation.error.issues[0].message };
  }
  const { email, role } = validation.data;

  try {
    const supabaseAdmin = createAdminClient();
    // ✅ CORRECCIÓ: No es pot filtrar per email aquí. Obtenim la llista i la filtrem després.
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) throw userError;

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      await _handleExistingUserInvite(supabase, { inviter, teamId: activeTeamId, invitedUser: existingUser, role });
    } else {
      await _handleNewUserInvite(supabase, { inviter, teamId: activeTeamId, email, role });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en enviar la invitació.";
    return { success: false, message };
  }

  revalidatePath('/settings/team');
  return { success: true, message: `Invitació enviada a ${email}.` };
}

export async function removeMemberAction(userIdToRemove: string) {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user: actionUser, activeTeamId } = session;

    const { data: actionUserMember } = await supabase.from('team_members').select('role').match({ user_id: actionUser.id, team_id: activeTeamId }).single();
    if (!hasPermission(actionUserMember?.role, PERMISSIONS.MANAGE_TEAM)) {
        return { success: false, message: "No tens permisos per eliminar membres." };
    }
    if (actionUser.id === userIdToRemove) {
        return { success: false, message: "No et pots eliminar a tu mateix." };
    }
    const { data: team } = await supabase.from('teams').select('owner_id').eq('id', activeTeamId).single();
    if (team?.owner_id === userIdToRemove) {
        return { success: false, message: "No es pot eliminar el propietari de l'equip." };
    }

    try {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.from('team_members').delete().match({ user_id: userIdToRemove, team_id: activeTeamId });

        const { data: { user: removedUser } } = await supabaseAdmin.auth.admin.getUserById(userIdToRemove);
        if (removedUser?.app_metadata?.active_team_id === activeTeamId) {
            await supabaseAdmin.auth.admin.updateUserById(userIdToRemove, {
                app_metadata: { ...removedUser?.app_metadata, active_team_id: null, active_team_plan: null }
            });
        }
    } catch {
        return { success: false, message: "Error en eliminar el membre." };
    }

    revalidatePath('/settings/team');
    return { success: true, message: "Membre eliminat correctament." };
}

export async function updateMemberRoleAction(memberUserId: string, newRole: 'admin' | 'member') {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user: actionUser, activeTeamId } = session;

    const validation = UpdateRoleSchema.safeParse({ newRole });
    if (!validation.success) {
        return { success: false, message: validation.error.issues[0].message };
    }
    
    const { data: actionUserMember } = await supabase.from('team_members').select('role').match({ user_id: actionUser.id, team_id: activeTeamId }).single();
    if (!hasPermission(actionUserMember?.role, PERMISSIONS.MANAGE_TEAM)) {
        return { success: false, message: "No tens permisos per a canviar rols." };
    }

    const { data: team } = await supabase.from('teams').select('owner_id').eq('id', activeTeamId).single();
    if (team?.owner_id === memberUserId) {
        return { success: false, message: "No es pot canviar el rol del propietari de l'equip." };
    }

    const { error } = await supabase.from('team_members').update({ role: validation.data.newRole }).match({ user_id: memberUserId, team_id: activeTeamId });
    if (error) {
        return { success: false, message: "Error en actualitzar el rol." };
    }

    revalidatePath('/settings/team');
    return { success: true, message: "Rol actualitzat correctament." };
}

// --- Accions de Gestió d'Invitacions (Internes) ---

export async function revokeInvitationAction(invitationId: string) {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user, activeTeamId } = session;

    const { data: member } = await supabase.from('team_members').select('role').match({ user_id: user.id, team_id: activeTeamId }).single();
    if (!hasPermission(member?.role, PERMISSIONS.MANAGE_TEAM)) {
        return { success: false, message: "No tens permisos per a revocar invitacions." };
    }

    const { error } = await supabase.from('invitations').delete().match({ id: invitationId, team_id: activeTeamId });
    if (error) {
        return { success: false, message: "Error en revocar la invitació." };
    }

    revalidatePath('/settings/team');
    return { success: true, message: "Invitació revocada." };
}

export async function acceptPersonalInviteAction(invitationId: string) {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user } = session;
    const supabaseAdmin = createAdminClient();

    const { data: invitation } = await supabase.from('invitations').select('*').eq('id', invitationId).single();
    if (!invitation || invitation.user_id !== user.id) {
        return { success: false, message: "Invitació invàlida." };
    }

    try {
        await supabaseAdmin.from('team_members').insert({
            team_id: invitation.team_id,
            user_id: user.id,
            role: invitation.role
        });

        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            app_metadata: { ...user.app_metadata, active_team_id: invitation.team_id }
        });
        
        await supabase.auth.refreshSession();
        await supabase.from('invitations').delete().eq('id', invitation.id);
    } catch (error) {
        if (error instanceof Error && error.message.includes('duplicate key value')) {
            console.log("L'usuari ja era membre, procedint igualment...");
        } else {
            return { success: false, message: "Error en acceptar la invitació." };
        }
    }

    revalidatePath('/settings/team');
    return { success: true };
}

export async function declinePersonalInviteAction(invitationId: string) {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user } = session;

    const { error } = await supabase.from('invitations').update({ status: 'declined' }).match({ id: invitationId, user_id: user.id });
    if (error) {
        return { success: false, message: "No s'ha pogut rebutjar la invitació." };
    }
    
    revalidatePath('/settings/team');
    return { success: true };
}

// --- Accions de Canvi de Context i Permisos ---

export async function switchActiveTeamAction(teamId: string) {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user } = session;

    const { data: member } = await supabase.from('team_members').select('team_id').match({ user_id: user.id, team_id: teamId }).maybeSingle();
    if (!member) {
        return { success: false, message: "No tens accés a aquest equip." };
    }
    
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, active_team_id: teamId } });
    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

export async function clearActiveTeamAction() {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { user } = session;

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, active_team_id: null } });
    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath('/settings/team', 'page');
    return { success: true };
}

export async function toggleInboxPermissionAction(targetUserId: string) {
    const session = await validateUserSession();
    if ('error' in session) return { success: false, message: session.error.message };
    const { supabase, user: granteeUser, activeTeamId } = session;

    const { data: member } = await supabase.from('team_members').select('role').eq('user_id', granteeUser.id).eq('team_id', activeTeamId).single();
    if (!['owner', 'admin'].includes(member?.role || '')) {
        return { success: false, message: "No tens permisos per a aquesta acció." };
    }

    try {
        const { data: existingPermission } = await supabase
            .from('inbox_permissions')
            .select('id')
            .match({ team_id: activeTeamId, grantee_user_id: granteeUser.id, target_user_id: targetUserId })
            .maybeSingle();

        if (existingPermission) {
            await supabase.from('inbox_permissions').delete().eq('id', existingPermission.id);
            revalidatePath('/settings/team');
            return { success: true, message: "Permís revocat." };
        } else {
            await supabase.from('inbox_permissions').insert({
                team_id: activeTeamId,
                grantee_user_id: granteeUser.id,
                target_user_id: targetUserId
            }).throwOnError();
            revalidatePath('/settings/team');
            return { success: true, message: "Permís concedit." };
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconegut.";
        return { success: false, message };
    }
}

// --- Helpers Privats (Funcions d'Ajuda) ---
// ✅ CORRECCIÓ: S'afegeixen els tipus als paràmetres.
type InviteParams = {
    inviter: User,
    teamId: string,
    role: string,
};
type ExistingUserInviteParams = InviteParams & { invitedUser: User };
type NewUserInviteParams = InviteParams & { email: string };


async function _handleExistingUserInvite(supabase: SupabaseClient, { inviter, teamId, invitedUser, role }: ExistingUserInviteParams) {
    const { data: teamData } = await supabase.from('teams').select('name').eq('id', teamId).single();
    const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', inviter.id).single();
    const inviterName = inviterProfile?.full_name || inviter.email;
    const teamName = teamData?.name || 'un equip';

    await supabase.from('invitations').insert({
        team_id: teamId,
        email: invitedUser.email,
        role: role,
        inviter_name: inviterName,
        team_name: teamName,
        user_id: invitedUser.id
    });

    _sendExistingUserEmail(invitedUser.email!, { inviterName, teamName });
}

async function _handleNewUserInvite(supabase: SupabaseClient, { inviter, teamId, email, role }: NewUserInviteParams) {
    const { data: teamData } = await supabase.from('teams').select('name').eq('id', teamId).single();
    const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', inviter.id).single();
    const inviterName = inviterProfile?.full_name || inviter.email;
    const teamName = teamData?.name || 'un equip';

    const { data: invitation } = await supabase.from('invitations').insert({
        team_id: teamId,
        email,
        role,
        inviter_name: inviterName,
        team_name: teamName
    }).select('token').single();

    if (invitation) {
        _sendNewUserEmail(email, { inviterName, teamName, token: invitation.token });
    }
}

async function _sendExistingUserEmail(to: string, { inviterName, teamName }: { inviterName: string, teamName: string }) {
    if (!process.env.RESEND_API_KEY) return console.log("Resend API Key no configurada. Saltant enviament d'email.");
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
        from: `Notificació de "${teamName}" <notificacions@ribotflow.com>`,
        to,
        subject: `Has estat convidat a unir-te a l'equip ${teamName}`,
        html: `<p>Hola de nou,</p><p><strong>${inviterName}</strong> t'ha convidat a unir-te al seu equip <strong>${teamName}</strong>.</p><p>Com que ja tens un compte, pots acceptar o rebutjar la invitació directament des del teu panell d'equips dins de la plataforma.</p><div style="text-align: center; margin: 25px 0;"><a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings/team" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Anar al meu panell</a></div>`
    });
}

async function _sendNewUserEmail(to: string, { inviterName, teamName, token }: { inviterName: string, teamName: string, token: string }) {
    if (!process.env.RESEND_API_KEY) return console.log("Resend API Key no configurada. Saltant enviament d'email.");
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
        from: `Invitació de "${teamName}" <invitacions@ribotflow.com>`,
        to,
        subject: `Has estat convidat a unir-te a l'equip ${teamName}`,
        html: `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;"><table align="center" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"><tr><td style="padding: 40px 30px;"><h1 style="font-size: 24px;">Has estat convidat!</h1><p style="font-size: 16px; line-height: 1.6;">Hola,</p><p style="font-size: 16px; line-height: 1.6;"><strong>${inviterName}</strong> t'ha convidat a unir-te al seu equip <strong>${teamName}</strong>.</p><div style="text-align: center; margin: 25px 0;"><a href="${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite?token=${token}" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Uneix-te a l'equip</a></div></td></tr></table></body></html>`
    });
}

