"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Resend } from 'resend';

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
        const { data: newTeam } = await supabase
            .from('teams')
            .insert({ name: teamName, owner_id: user.id })
            .select('id')
            .single()
            .throwOnError();

        await supabase
            .from('team_members')
            .insert({ team_id: newTeam.id, user_id: user.id, role: 'owner' })
            .throwOnError();

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconegut en crear l'equip.";
        return { success: false, message };
    }

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    try {
        // ✅ PAS 1: Busquem primer l'ID de l'equip de l'usuari. És més segur.
        const { data: memberData, error: memberError } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .single();

        if (memberError || !memberData) {
            return { success: false, message: "No s'ha pogut trobar el teu equip." };
        }
        const teamId = memberData.team_id;

        // ✅ PAS 2: Amb l'ID, busquem el nom de l'equip directament a la taula 'teams'.
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('name')
            .eq('id', teamId)
            .single();

        if (teamError || !teamData) {
            return { success: false, message: "No s'ha pogut trobar el nom del teu equip." };
        }
        const teamName = teamData.name;
        
        // Obtenim el nom de qui convida des del seu perfil
        const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        const inviterName = inviterProfile?.full_name || user.email;

        const { data: invitation, error: inviteError } = await supabase
            .from('invitations')
            .insert({ team_id: teamId, email, role })
            .select('token')
            .single();
        if (inviteError) throw inviteError;

        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
            from: `Invitació de "${teamName}" <invitacions@ribotflow.com>`, // Canvia el teu domini
            to: email,
            subject: `Has estat convidat a unir-te a l'equip ${teamName}`,
            html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                <table align="center" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h1 style="font-size: 24px;">Has estat convidat!</h1>
                            <p style="font-size: 16px; line-height: 1.6;">Hola,</p>
                            <p style="font-size: 16px; line-height: 1.6;">
                                <strong>${inviterName}</strong> t'ha convidat a unir-te al seu equip <strong>${teamName}</strong>.
                            </p>
                            <div style="text-align: center; margin: 25px 0;">
                                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite?token=${invitation.token}" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                    Uneix-te a l'equip
                                </a>
                            </div>
                        </td>
                    </tr>
                </table>
            </body>
            </html>`
        });
        
        revalidatePath('/settings/team');
        return { success: true, message: `Invitació enviada a ${email}.` };

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error en enviar la invitació.";
        return { success: false, message };
    }
}

/**
 * S'executa quan algú fa clic a l'enllaç d'invitació.
 * Decideix si l'usuari ha d'anar a login o a signup.
 */
export async function resolveInvitationAction(token: string) {
    if (!token) return redirect('/login?message=Token d\'invitació invàlid.');

    const supabase = createClient(cookies());
    const { data: invitation } = await supabase.from('invitations').select('email').eq('token', token).single();
    if (!invitation) return redirect('/login?message=Invitació invàlida o caducada.');

    const invitedEmail = invitation.email;
    const supabaseAdmin = createAdminClient();

    // Forma correcta de buscar usuari per email
    const { users, error } = await supabaseAdmin.auth.admin.listUsers().then(response => {
        return {
            users: response.data.users.filter(user => user.email === invitedEmail),
            error: response.error
        };
    });

    if (error) {
        // Gestionar l'error
        return redirect('/login?message=Error del servidor.');
    }

    if (users && users.length > 0) {
        // L'usuari existeix
        redirect(`/login?invite_token=${token}&email=${encodeURIComponent(invitedEmail)}`);
    } else {
        // L'usuari no existeix
        redirect(`/invitation/accept?invite_token=${token}&email=${encodeURIComponent(invitedEmail)}`);
    }
}

/**
 * S'executa DESPRÉS que un usuari hagi iniciat sessió o s'hagi registrat amb un token.
 * L'afegeix a l'equip i esborra la invitació.
 */
// Aquesta acció ara accepta l'ID de l'usuari directament
export async function acceptInviteAction(token: string, userId: string) {
    // Utilitzem el client d'admin per poder operar sense una sessió activa
    const supabaseAdmin = createAdminClient(); 

    // 1. Busquem la invitació per obtenir el team_id i el rol
    const { data: invitation, error: invitationError } = await supabaseAdmin
        .from('invitations')
        .select('team_id, role, email')
        .eq('token', token)
        .single();

    if (invitationError || !invitation) {
        console.error("Error: Invitació invàlida o no trobada", invitationError);
        return; // No redirigim, simplement sortim
    }

    // 2. Afegim l'usuari a la taula de membres
    const { error: insertError } = await supabaseAdmin
        .from('team_members')
        .insert({ team_id: invitation.team_id, user_id: userId, role: invitation.role });

    if (insertError) {
        console.error("Error en inserir el nou membre:", insertError);
        return;
    }

    // 3. Actualitzem el perfil de l'usuari per marcar l'onboarding com a completat
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);

    if (updateError) {
        console.error("Error en actualitzar el perfil:", updateError);
        return;
    }

    // 4. Esborrem la invitació per netejar
    await supabaseAdmin.from('invitations').delete().eq('token', token);

    console.log(`Usuari ${userId} afegit correctament a l'equip ${invitation.team_id}`);
    
    // Aquesta funció ja no redirigeix. La redirecció final la farà el callback.
}
/**
 * Elimina una invitació pendent.
 */
export async function revokeInvitationAction(invitationId: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    // 1. Obtenir el rol de l'usuari actual
    const { data: currentUserMember } = await supabase
        .from('team_members')
        .select('role, team_id')
        .eq('user_id', user.id)
        .single();

    if (!currentUserMember) {
        return { success: false, message: "No pertanys a cap equip." };
    }

    // 2. Comprovar si el rol permet l'acció
    const allowedRoles = ['owner', 'admin'];
    if (!allowedRoles.includes(currentUserMember.role)) {
        return { success: false, message: "No tens permisos per a realitzar aquesta acció." };
    }
    
    // 3. (Extra seguretat) Comprovar que la invitació pertany al seu equip
    const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)
        .eq('team_id', currentUserMember.team_id); // Només pot esborrar del seu equip

    if (deleteError) {
        return { success: false, message: "Error en revocar la invitació." };
    }
    
    revalidatePath('/settings/team');
    return { success: true };
}