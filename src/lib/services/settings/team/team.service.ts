// src/lib/services/settings/team.service.ts (FITXER CORREGIT I COMPLET)
"use server";

import { type SupabaseClient, type User } from "@supabase/supabase-js";
import { type Database } from "@/types/supabase";
import { createAdminClient } from "@/lib/supabase/admin";
import { PERMISSIONS, type Role } from "@/lib/permissions/permissions";
import { Resend } from "resend";
// ✅ Importem el tipus que faltava per a getCompanyProfile
import type { CompanyProfile } from "@/types/settings/team";

// ---
// ✅ 1. DEFINICIÓ I EXPORTACIÓ DE TIPUS DE DOMINI
// Aquests tipus ara són la font de veritat i s'importaran a 'page.tsx' i 'TeamData.tsx'.
// (Aquests són els tipus que abans estaven a 'page.tsx')
// ---

export type Team = { id: string; name: string };
export type Invitation = { id: string; email: string; role: string };
export type TeamMember = {
  role: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};
export type ActiveTeamData = {
  team: Team;
  teamMembers: TeamMember[];
  pendingInvitations: Invitation[];
  currentUserRole: string;
  inboxPermissions: { grantee_user_id: string; target_user_id: string }[];
};
export type UserTeam = {
  role: string;
  teams: { id: string; name: string } | null;
};
export type PersonalInvitation = {
  id: string;
  team_name: string;
  inviter_name: string;
};

// --- Tipus Públics del Servei (Interns) ---
export type FormState = { success: boolean; message: string };
export type TeamHubData = {
  userTeams: UserTeam[];
  personalInvitations: PersonalInvitation[];
};
// ❌ Ja no necessitem: export type { ActiveTeamData, TeamMember, Invitation };
// perquè ara s'exporten directament a dalt.

// ---
// ⚙️ FUNCIONS DE LECTURA (per a la pàgina)
// ---

/**
 * SERVEI: Obté les dades del "Lobby"
 */
export async function getTeamHubData(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TeamHubData> {
  const [teamsRes, invitesRes] = await Promise.all([
    supabase.from("team_members").select("role, teams(id, name)").eq(
      "user_id",
      userId,
    ),
    supabase.from("invitations")
      .select("id, team_name, inviter_name")
      .match({ user_id: userId, status: "pending" }),
  ]);

  // ✅ CORRECCIÓ 1 (de l'error anterior): Mapegem les invitacions per eliminar els 'null'
  const personalInvitations: PersonalInvitation[] = (invitesRes.data || []).map(
    (invite) => ({
      id: invite.id,
      team_name: invite.team_name || "Equip desconegut", // Valor per defecte
      inviter_name: invite.inviter_name || "Algú", // Valor per defecte
    })
  );

  return {
    userTeams: (teamsRes.data as unknown as UserTeam[]) || [],
    personalInvitations: personalInvitations,
  };
}

/**
 * SERVEI: Obté les dades del panell de control d'un equip actiu.
 */
export async function getActiveTeamData(
  supabase: SupabaseClient<Database>,
  activeTeamId: string,
  currentUserId: string, // No el fem servir aquí, però podria ser útil
  currentUserRole: string,
): Promise<ActiveTeamData> {
  const [teamRes, invitesRes, permissionsRes, membersRes] = await Promise.all([
    supabase.from("teams").select("id, name").eq("id", activeTeamId).single(),
    supabase.from("invitations").select("id, email, role").eq(
      "team_id",
      activeTeamId,
    ).eq("status", "pending"),
    supabase.from("inbox_permissions").select("grantee_user_id, target_user_id")
      .eq("team_id", activeTeamId),
    supabase.from("team_members_with_profiles").select("*").eq(
      "team_id",
      activeTeamId,
    ),
  ]);

  const finalTeamMembers: TeamMember[] = (membersRes.data || []).map((m) => ({
    role: m.role ?? "",
    profiles: m.user_id
      ? {
        id: m.user_id,
        full_name: m.full_name,
        email: m.email,
        avatar_url: m.avatar_url,
      }
      : null,
  }));

  return {
    team: teamRes.data as Team,
    teamMembers: finalTeamMembers,
    pendingInvitations: (invitesRes.data as Invitation[]) || [],
    currentUserRole: currentUserRole,
    inboxPermissions: permissionsRes.data || [],
  };
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (per a les Server Actions)
// ---

/**
 * SERVEI: Crea un nou equip.
 */
export async function createTeam(
  supabase: SupabaseClient<Database>,
  teamName: string,
): Promise<FormState> {
  try {
    const { error } = await supabase.rpc("create_team_with_defaults", {
      team_name: teamName,
    });
    if (error) throw error;
    return { success: true, message: "Equip creat." };
  } catch (error: unknown) {
    console.error("Error en la transacció de crear equip:", error);
    const msg = error instanceof Error
      ? error.message
      : "No s'ha pogut crear l'equip.";
    return { success: false, message: msg };
  }
}

/**
 * SERVEI: Convida un usuari a un equip.
 */
export async function inviteUser(
  supabase: SupabaseClient<Database>,
  inviter: User,
  activeTeamId: string,
  email: string,
  role: Role,
): Promise<FormState> {
  try {
    const { data: existingInvite } = await supabase.from("invitations").select(
      "id",
    ).match({ email, team_id: activeTeamId, status: "pending" }).maybeSingle();
    if (existingInvite) {
      return {
        success: false,
        message:
          "Ja s'ha enviat una invitació a aquest usuari per a aquest equip.",
      };
    }

    const { data: existingUserId } = await supabase.rpc(
      "get_user_id_by_email",
      { email_to_check: email },
    );

    const [teamRes, inviterProfileRes] = await Promise.all([
      supabase.from("teams").select("name").eq("id", activeTeamId).single(),
      supabase.from("profiles").select("full_name").eq("id", inviter.id)
        .single(),
    ]);

    if (teamRes.error) throw new Error("L'equip actiu no s'ha trobat.");
    const teamName = teamRes.data.name;
    const inviterName = inviterProfileRes.data?.full_name || inviter.email!;

    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .insert({
        team_id: activeTeamId,
        email,
        role,
        inviter_name: inviterName,
        team_name: teamName,
        user_id: existingUserId,
      })
      .select("id, token")
      .single();

    if (inviteError) throw inviteError;
    if (!invitation) throw new Error("No s'ha pogut crear la invitació.");

    const resend = new Resend(process.env.RESEND_API_KEY);
    const inviteUrl =
      `${process.env.NEXT_PUBLIC_SITE_URL}/invitation/accept?token=${invitation.token}&email=${
        encodeURIComponent(email)
      }`;
    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings/team`;

    if (existingUserId) {
      await resend.emails.send({
        from: `Notificació de "${teamName}" <invitacions@ribotflow.com>`,
        to: email,
        subject: `Has estat convidat a unir-te a l'equip ${teamName}`,
        html:
          `<p>Hola de nou, <strong>${inviterName}</strong> t'ha convidat a l'equip <strong>${teamName}</strong>. Com que ja tens un compte, pots acceptar-la des del teu panell d'equips.</p><div style="text-align: center; margin: 25px 0;"><a href="${loginUrl}" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Anar al meu panell</a></div>`,
      });
    } else {
      await resend.emails.send({
        from: `Invitació de "${teamName}" <invitacions@ribotflow.com>`,
        to: email,
        subject: `Has estat convidat a unir-te a l'equip ${teamName}`,
        html:
          `<p><strong>${inviterName}</strong> t'ha convidat a unir-te a <strong>${teamName}</strong>.</p><div style="text-align: center; margin: 25px 0;"><a href="${inviteUrl}" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Uneix-te a l'equip</a></div>`,
      });
    }

    return { success: true, message: `Invitació enviada a ${email}.` };
  } catch (error: unknown) {
    console.error("Error en el procés d'invitació:", error);
    const msg = error instanceof Error
      ? error.message
      : "No s'ha pogut enviar la invitació.";
    return { success: false, message: msg };
  }
}

/**
 * SERVEI: Resol una invitació (no requereix sessió).
 */
export async function resolveInvitation(
  token: string,
): Promise<{ redirectUrl: string }> {
  if (!token) {
    return { redirectUrl: "/login?message=El token d'invitació no és vàlid." };
  }

  const supabaseAdmin = createAdminClient();
  const { data: invitation } = await supabaseAdmin
    .from("invitations")
    .select("email")
    .match({ token, status: "pending" })
    .single();

  if (!invitation) {
    return {
      redirectUrl:
        "/login?message=La teva invitació no és vàlida o ja ha estat utilitzada.",
    };
  }

  const invitedEmail = invitation.email;
  const { data: existingUserId, error: rpcError } = await supabaseAdmin.rpc(
    "get_user_id_by_email",
    {
      email_to_check: invitedEmail,
    },
  );

  if (rpcError) {
    console.error("Error a l'RPC get_user_id_by_email:", rpcError);
    return { redirectUrl: "/login?message=Hi ha hagut un error al servidor." };
  }

  if (existingUserId) {
    return {
      redirectUrl: `/login?invite_token=${token}&email=${
        encodeURIComponent(invitedEmail)
      }`,
    };
  } else {
    return {
      redirectUrl: `/invitation/accept?token=${token}&email=${
        encodeURIComponent(invitedEmail)
      }`,
    };
  }
}

/**
 * SERVEI: Accepta una invitació (requereix usuari logat).
 */
/**
 * SERVEI: Accepta una invitació (requereix usuari logat).
 * (Lògica de 'acceptInviteAction')
 */
export async function acceptInvite(
  supabase: SupabaseClient<Database>,
  user: User,
  token: string,
): Promise<{ redirectUrl: string }> {
  try {
    const { error } = await supabase.rpc(
      "accept_invitation_and_set_active_team",
      {
        invite_token: token,
      },
    );
    if (error) throw error;

    await supabase.auth.refreshSession();
    const locale = user.user_metadata?.locale || "ca";
    return { redirectUrl: `/${locale}/dashboard?success=Benvingut a l'equip!` };
  } catch (error: unknown) {
    let errorMessage = "Error en processar la invitació.";
    if (error instanceof Error) {
      if (error.message.includes("INVITATION_NOT_FOUND")) {
        errorMessage =
          "La teva invitació no és vàlida o ja ha estat utilitzada.";
      } else if (error.message.includes("INVITATION_FOR_DIFFERENT_USER")) {
        errorMessage =
          "Aquesta invitació està destinada a un altre compte de correu.";
      } else {
        errorMessage = error.message;
      }
    }
    console.error("Error a acceptInviteAction:", errorMessage);
    return {
      redirectUrl: `/dashboard?error=${encodeURIComponent(errorMessage)}`,
    };
  }
}

/**
 * SERVEI: Revoca una invitació pendent.
 */
export async function revokeInvitation(
  supabase: SupabaseClient<Database>,
  activeTeamId: string,
  invitationId: string,
): Promise<FormState> {
  try {
    const { error } = await supabase
      .from("invitations")
      .delete()
      .match({ id: invitationId, team_id: activeTeamId });
    if (error) throw error;
    return { success: true, message: "Invitació revocada." };
  } catch (error: unknown) {
    const msg = error instanceof Error
      ? error.message
      : "No s'ha pogut revocar la invitació.";
    return { success: false, message: msg };
  }
}

/**
 * SERVEI: Canvia l'equip actiu de l'usuari.
 */
export async function switchActiveTeam(
  supabase: SupabaseClient<Database>,
  user: User,
  teamId: string,
): Promise<FormState> {
  try {
    const { data: member } = await supabase
      .from("team_members")
      .select("team_id")
      .match({ user_id: user.id, team_id: teamId })
      .maybeSingle();
    if (!member) {
      return { success: false, message: "No tens accés a aquest equip." };
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("team_id", teamId)
      .maybeSingle();
    const newTeamPlan = (subscription?.status === "active")
      ? subscription.plan_id
      : "free";

    const supabaseAdmin = createAdminClient();
    const { error: updateError } = await supabaseAdmin.auth.admin
      .updateUserById(
        user.id,
        {
          app_metadata: {
            ...user.app_metadata,
            active_team_id: teamId,
            active_team_plan: newTeamPlan,
          },
        },
      );
    if (updateError) throw updateError;

    await supabase.auth.refreshSession();
    return { success: true, message: "Equip canviat." };
  } catch (error: unknown) {
    const msg = error instanceof Error
      ? error.message
      : "No s'ha pogut canviar d'equip.";
    return { success: false, message: msg };
  }
}

/**
 * SERVEI: Activa/desactiva permís d'inbox.
 */
export async function toggleInboxPermission(
  supabase: SupabaseClient<Database>,
  granteeUser: User,
  activeTeamId: string,
  targetUserId: string,
): Promise<FormState> {
  if (granteeUser.id === targetUserId) {
    return {
      success: false,
      message: "No pots assignar-te permisos a tu mateix.",
    };
  }

  try {
    const { data: existingPermission } = await supabase
      .from("inbox_permissions")
      .select("id")
      .match({
        team_id: activeTeamId,
        grantee_user_id: granteeUser.id,
        target_user_id: targetUserId,
      })
      .maybeSingle();

    if (existingPermission) {
      const { error } = await supabase.from("inbox_permissions").delete().eq(
        "id",
        existingPermission.id,
      );
      if (error) throw error;
      return { success: true, message: "Permís revocat." };
    } else {
      const { error } = await supabase.from("inbox_permissions").insert({
        team_id: activeTeamId,
        grantee_user_id: granteeUser.id,
        target_user_id: targetUserId,
      });
      if (error) throw error;
      return { success: true, message: "Permís concedit." };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error
      ? error.message
      : "No s'ha pogut actualitzar el permís.";
    return { success: false, message: msg };
  }
}

/**
 * SERVEI: Neteja l'equip actiu (torna al lobby).
 */
export async function clearActiveTeam(user: User): Promise<FormState> {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          ...user.app_metadata,
          active_team_id: null,
          active_team_plan: null,
        },
      },
    );
    if (error) throw error;
    return { success: true, message: "Has sortit de l'equip." };
  } catch (error: unknown) {
    const msg = error instanceof Error
      ? error.message
      : "No s'ha pogut sortir de l'equip.";
    return { success: false, message: msg };
  }
}

/**
 * SERVEI: Accepta una invitació personal (des del lobby).
 */
export async function acceptPersonalInvite(
  supabase: SupabaseClient<Database>,
  invitationId: string,
): Promise<FormState> {
  try {
    const { error } = await supabase.rpc("accept_personal_invitation", {
      invitation_id: invitationId,
    });
    if (error) throw error;
    await supabase.auth.refreshSession();
    return { success: true, message: "Invitació acceptada." };
  } catch (error: unknown) {
    let msg = "No s'ha pogut acceptar la invitació.";
    if (
      error instanceof Error && error.message.includes("INVALID_INVITATION")
    ) {
      msg = "Aquesta invitació no és vàlida o ja no està disponible.";
    }
    return { success: false, message: msg };
  }
}

/**
 * SERVEI: Rebutja una invitació personal (des del lobby).
 */
export async function declinePersonalInvite(
  supabase: SupabaseClient<Database>,
  user: User,
  invitationId: string,
): Promise<FormState> {
  try {
    const { error } = await supabase
      .from("invitations")
      .update({ status: "declined" })
      .match({ id: invitationId, user_id: user.id });
    if (error) throw error;
    return { success: true, message: "Invitació rebutjada." };
  } catch (error: unknown) {
    return { success: false, message: "No s'ha pogut rebutjar la invitació." };
  }
}

/**
 * SERVEI: Elimina un membre de l'equip.
 */
export async function removeMember(
  supabase: SupabaseClient<Database>,
  activeTeamId: string,
  actionUser: User,
  userIdToRemove: string,
): Promise<FormState> {
  if (actionUser.id === userIdToRemove) {
    return { success: false, message: "No et pots eliminar a tu mateix." };
  }
  const { data: team } = await supabase.from("teams").select("owner_id").eq(
    "id",
    activeTeamId,
  ).single();
  if (team?.owner_id === userIdToRemove) {
    return {
      success: false,
      message: "No es pot eliminar el propietari de l'equip.",
    };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { error: deleteError } = await supabaseAdmin
      .from("team_members")
      .delete()
      .match({ user_id: userIdToRemove, team_id: activeTeamId });
    if (deleteError) throw deleteError;

    const { data: { user: removedUser } } = await supabaseAdmin.auth.admin
      .getUserById(userIdToRemove);
    if (removedUser?.app_metadata?.active_team_id === activeTeamId) {
      await supabaseAdmin.auth.admin.updateUserById(userIdToRemove, {
        app_metadata: {
          ...removedUser.app_metadata,
          active_team_id: null,
          active_team_plan: null,
        },
      });
    }
    return { success: true, message: "Membre eliminat correctament." };
  } catch (error: unknown) {
    const msg = error instanceof Error
      ? error.message
      : "No s'ha pogut eliminar el membre.";
    return { success: false, message: msg };
  }
}

/**
 * SERVEI: Actualitza el rol d'un membre.
 */
export async function updateMemberRole(
  supabase: SupabaseClient<Database>,
  activeTeamId: string,
  memberUserId: string,
  newRole: Role,
): Promise<FormState> {
  if (newRole === "owner") {
    return {
      success: false,
      message:
        "La propietat de l'equip no es pot assignar, s'ha de transferir.",
    };
  }

  try {
    const { data: team } = await supabase.from("teams").select("owner_id").eq(
      "id",
      activeTeamId,
    ).single();
    if (team?.owner_id === memberUserId) {
      return {
        success: false,
        message: "No es pot canviar el rol del propietari de l'equip.",
      };
    }

    const { error } = await supabase
      .from("team_members")
      .update({ role: newRole })
      .match({ user_id: memberUserId, team_id: activeTeamId });
    if (error) throw error;

    return { success: true, message: "Rol actualitzat correctament." };
  } catch (error: unknown) {
    const msg = error instanceof Error
      ? error.message
      : "No s'ha pogut actualitzar el rol.";
    return { success: false, message: msg };
  }
}

/**
 * SERVEI: Obté el perfil de l'empresa (dades de l'emissor).
 */
export async function getCompanyProfile(
  supabase: SupabaseClient<Database>,
  teamId: string,
): Promise<CompanyProfile | null> { // ✅ CORRECCIÓ 2: Canviat 'any' per 'CompanyProfile'
  const { data, error } = await supabase
    .from("teams")
    .select(
      "id, company_name: name, company_tax_id: tax_id, company_address: address, company_email: email, company_phone: phone, logo_url",
    )
    .eq("id", teamId)
    .single<CompanyProfile>(); // ✅ Tipem la resposta

  if (error) {
    console.error("Error service(getCompanyProfile):", error.message);
    return null;
  }
  return data;
}

/**
 * SERVEI: Obté membres (simplificat).
 */
export async function getTeamMembers(
  supabase: SupabaseClient<Database>,
  teamId: string,
) {
  return supabase
    .from("team_members_with_profiles")
    .select("user_id, full_name")
    .eq("team_id", teamId);
}
