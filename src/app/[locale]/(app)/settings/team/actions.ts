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
/**
 * S'executa DESPRÉS que un usuari hagi iniciat sessió o s'hagi registrat amb un token.
 * AFEGEIX l'usuari a l'equip, ESBORRA la invitació i ACTUALITZA EL SEU TOKEN.
 */
export async function acceptInviteAction(token: string) {
    const supabase = createClient(cookies());
    const supabaseAdmin = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/login?invite_token=${token}&message=Has d'iniciar sessió per acceptar.`);
    }

    try {
        const { data: invitation } = await supabase
            .from('invitations')
            .select('*')
            .eq('token', token)
            .single()
            .throwOnError();
            
        if (invitation.email !== user.email) {
            throw new Error("Aquesta invitació està destinada a un altre usuari.");
        }

        await supabase
            .from('team_members')
            .insert({ team_id: invitation.team_id, user_id: user.id, role: invitation.role })
            .throwOnError();
        
        // ✅ PAS CLAU 1: Busquem la subscripció de l'equip al qual s'acaba d'unir.
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('team_id', invitation.team_id)
            .single();

        const teamPlan = (subscription?.status === 'active') ? subscription.plan_id : 'free';

        // ✅ PAS CLAU 2: Actualitzem les metadades de l'usuari (el seu token) a l'instant.
        await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { app_metadata: { 
                ...user.app_metadata, 
                active_team_id: invitation.team_id,
                active_team_plan: teamPlan 
            }}
        );
        
        await supabase.from('invitations').delete().eq('id', invitation.id);

    } catch (error) {
        // Ignorem l'error de clau duplicada si l'usuari ja era membre
        if (error instanceof Error && error.message.includes('duplicate key value')) {
            console.log("L'usuari ja era membre, procedint a actualitzar el seu token...");
            // Si ja era membre, igualment actualitzem el seu token per si ha canviat de pla
            // (Aquesta lògica es podria afegir aquí si fos necessari)
        } else {
            const message = error instanceof Error ? error.message : "Error en processar la invitació.";
            return redirect(`/dashboard?message=${encodeURIComponent(message)}`);
        }
    }

    // El redirigim a la pàgina de l'equip perquè vegi que ja n'és membre.
    redirect('/settings/team');
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

/**
 * Canvia l'equip actiu de l'usuari directament a les seves metadades d'autenticació (JWT).
 */
export async function switchActiveTeamAction(teamId: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    // Comprovació de seguretat
    const { data: member } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .maybeSingle();
    
    if (!member) return { success: false, message: "No tens accés a aquest equip." };

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { app_metadata: { active_team_id: teamId } }
    );
    
    if (error) {
        return { success: false, message: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
}

/**
 * ✅ NOU: Neteja l'equip actiu, per a tornar al "vestíbul".
 */
export async function clearActiveTeamAction() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { app_metadata: { active_team_id: null } }
    );

    if (error) return { success: false, message: error.message };
    
    revalidatePath('/settings/team', 'page');
    return { success: true };
}