// /app/settings/team/actions.ts (o on tinguis les teves accions)

"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from 'next/navigation';
import { cookies } from "next/headers";
import { Resend } from 'resend';
import { revalidatePath } from "next/cache";

/**
 * Crea un nou equip i assigna l'usuari actual com a propietari.
 */
export async function createTeamAction(formData: FormData) {
  const teamName = formData.get('teamName') as string;
  if (!teamName || teamName.trim().length < 2) {
    return { success: false, message: "El nom de l'equip és obligatori." };
  }

  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticat." };

  try {
    // 1. Creem l'equip
    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert({ name: teamName, owner_id: user.id })
      .select('id')
      .single();
    if (teamError) throw teamError;

    // 2. Afegim l'usuari actual com a 'owner' a la taula de membres
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: newTeam.id, user_id: user.id, role: 'owner' });
    if (memberError) throw memberError;

  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconegut.";
    return { success: false, message };
  }

  // 3. Redirigim per a forçar la recàrrega de dades
  redirect('/settings/team');
}

/**
 * Convida un nou usuari a l'equip actual.
 */
export async function inviteUserAction(formData: FormData) {
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;

  if (!email || !role) {
    return { success: false, message: "Falten l'email o el rol." };
  }

  const supabase = createClient(cookies());
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: "No autenticat." };

  // Busquem l'equip de l'usuari actual per obtenir el nom
  const { data: memberData } = await supabase
    .from('team_members')
    .select('team_id, teams(name)')
    .eq('user_id', user.id)
    .single();

  if (!memberData || !memberData.teams) {
    return { success: false, message: "No s'ha trobat el teu equip." };
  }
  const teamId = memberData.team_id;
  // Aquesta línia ja la tenies, assegura't que sigui correcta per obtenir el nom
  const teamName = (memberData.teams as unknown as { name: string }).name;

  try {
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({ team_id: teamId, email, role })
      .select('token')
      .single();
    if (inviteError) throw inviteError;

    // Enviem l'email amb Resend
    // ✅ Enviem l'email amb el nou disseny HTML
    await resend.emails.send({
      from: `Invitació de "${teamName}" <invitacions@ribotflow.com>`,
      to: email,
      subject: `Invitació per unir-te a l'equip ${teamName}`,
      // 👇 Aquest és el nou cos del correu
      html: `
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitació a ${teamName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                </td>
        </tr>
        <tr>
            <td bgcolor="#ffffff" style="padding: 40px 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                <h1 style="color: #333333; font-size: 24px;">Has rebut una invitació!</h1>
                <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                    Hola,
                </p>
                <p style="color: #555555; font-size: 16px; line-height: 1.6;">
                    Has estat convidat per <strong>${user.email}</strong> per unir-te a l'equip <strong>${teamName}</strong>.
                </p>
                
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <a href="http://localhost:3000/accept-invite?token=${invitation.token}" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                                Acceptar Invitació
                            </a>
                        </td>
                    </tr>
                </table>
                
                <p style="color: #555555; font-size: 14px; line-height: 1.6;">
                    Si no esperaves aquesta invitació, pots ignorar aquest correu.
                </p>
                <p style="color: #999999; font-size: 12px; line-height: 1.6; margin-top: 30px;">
                    Si el botó no funciona, copia i enganxa aquest enllaç al teu navegador:
                    <br>
                    <a href="http://localhost:3000/accept-invite?token=${invitation.token}" target="_blank" style="color: #007bff; text-decoration: underline;">http://localhost:3000/accept-invite?token=${invitation.token}</a>
                </p>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding: 20px 0; color: #999999; font-size: 12px;">
                &copy; ${new Date().getFullYear()} ${teamName}. Tots els drets reservats.
            </td>
        </tr>
      </table>
      </body>
      </html>
      `
    });

    return { success: true, message: `Invitació enviada a ${email}.` };

  } catch (error) {
           const message = error instanceof Error ? error.message : "Error en enviar la invitació.";
    return { success: false, message };
  }
}
/**
 * Accepta una invitació, afegeix l'usuari a l'equip i esborra la invitació.
 */
export async function acceptInviteAction(token: string) {
  if (!token) {
    return { success: false, message: "Falta el token d'invitació." };
  }

  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();

  // Ara assumim que l'usuari JA està autenticat quan es crida aquesta funció.
  // Si no ho està, la pàgina de client l'haurà redirigit abans.
  if (!user) {
    return { success: false, message: "Has d'iniciar sessió per acceptar una invitació." };
  }

  try {
    const { data: invitation, error: findError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (findError || !invitation) {
      throw new Error("La invitació no és vàlida o ja ha estat utilitzada.");
    }

    if (invitation.email !== user.email) {
      throw new Error("Aquesta invitació està destinada a un altre usuari.");
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: invitation.role,
      });

    if (memberError && memberError.code !== '23505') { // Ignorem l'error si ja és membre
      throw memberError;
    }

    await supabase.from('invitations').delete().eq('id', invitation.id);

  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en processar la invitació.";
    return { success: false, message };
  }

  // Redirigim a la pàgina de l'equip un cop tot ha anat bé.
  redirect('/settings/team');
}
/**
 * Elimina una invitació pendent.
 */
export async function revokeInvitationAction(invitationId: string) {
  const supabase = createClient(cookies());
  // Aquí hauries d'afegir lògica per comprovar que l'usuari actual
  // té permisos per eliminar la invitació (és admin o owner).

  await supabase.from('invitations').delete().eq('id', invitationId);
  revalidatePath('/settings/team'); // Refresquem la pàgina per actualitzar la llista
}