"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Resend } from 'resend';

/**
 * Crea un nou equip i, crucialment, les seves etapes de pipeline per defecte.
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
        const { data: newTeam } = await supabase
            .from('teams')
            .insert({ name: teamName, owner_id: user.id })
            .select('id')
            .single()
            .throwOnError();

        // 2. Afegim el propietari com a membre
        await supabase
            .from('team_members')
            .insert({ team_id: newTeam.id, user_id: user.id, role: 'owner' })
            .throwOnError();

        // 3. Afegim les etapes del pipeline per defecte per a aquest nou equip
        const defaultStages = [
            { name: 'Prospecte', position: 1, team_id: newTeam.id, user_id: user.id },
            { name: 'Contactat', position: 2, team_id: newTeam.id, user_id: user.id },
            { name: 'Proposta Enviada', position: 3, team_id: newTeam.id, user_id: user.id },
            { name: 'Negociació', position: 4, team_id: newTeam.id, user_id: user.id },
            { name: 'Guanyat', position: 5, team_id: newTeam.id, user_id: user.id },
            { name: 'Perdut', position: 6, team_id: newTeam.id, user_id: user.id },
        ];
        await supabase.from('pipeline_stages').insert(defaultStages).throwOnError();

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconegut en crear l'equip.";
        return { success: false, message };
    }

    revalidatePath('/settings/team');
    redirect('/settings/team');
}

/**
 * Convida un nou usuari a l'equip actual.
 */
/**
 * Convida un nou usuari a l'equip ACTIU.
 */
export async function inviteUserAction(formData: FormData) {
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    console.log(`[ACTION] Iniciant inviteUserAction per a l'email: ${email} amb el rol: ${role}`);

    if (!email || !role) {
        console.error("[ACTION ERROR] Falten l'email o el rol.");
        return { success: false, message: "Falten l'email o el rol." };
    }

    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("[ACTION ERROR] Usuari no autenticat.");
        return { success: false, message: "No autenticat." };
    }
    console.log(`[ACTION] Usuari autenticat: ${user.id}`);

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        console.error("[ACTION ERROR] L'usuari no té un equip actiu seleccionat al seu token.");
        return { success: false, message: "No s'ha pogut determinar l'equip actiu." };
    }
    console.log(`[ACTION] Equip actiu obtingut del token: ${activeTeamId}`);

    try {
        console.log(`[ACTION] Obtenint dades de l'equip ${activeTeamId}...`);
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('name')
            .eq('id', activeTeamId)
            .single();

        if (teamError) {
            console.error("[ACTION DB ERROR] Error en obtenir el nom de l'equip:", teamError);
            throw teamError;
        }
        if (!teamData) {
            throw new Error("L'equip actiu no s'ha trobat a la base de dades.");
        }
        const teamName = teamData.name;
        console.log(`[ACTION] Nom de l'equip obtingut: ${teamName}`);

        console.log(`[ACTION] Obtenint el perfil de qui convida: ${user.id}...`);
        const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        const inviterName = inviterProfile?.full_name || user.email;
        console.log(`[ACTION] Nom de qui convida: ${inviterName}`);

        console.log("[ACTION] Inserint la invitació a la base de dades...");
        const { data: invitation, error: inviteError } = await supabase
            .from('invitations')
            .insert({ team_id: activeTeamId, email, role, inviter_name: inviterName, team_name: teamName })
            .select('token')
            .single();

        if (inviteError) {
            console.error("[ACTION DB ERROR] Error en inserir la invitació:", inviteError);
            throw inviteError;
        }
        console.log("[ACTION] Invitació inserida correctament.");
        
        // La teva lògica de Resend per enviar l'email...
        console.log("[ACTION] Enviant email a través de Resend...");

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

        console.log("[ACTION] Email enviat (simulació/execució).");
        
        revalidatePath('/settings/team');
        return { success: true, message: `Invitació enviada a ${email}.` };

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error en enviar la invitació.";
        console.error("💥 [ACTION CATCH] S'ha produït un error final:", message);
        return { success: false, message };
    }
}

/**
 * Aquesta acció és el primer punt d'entrada quan un usuari fa clic a un enllaç d'invitació.
 * Ha de ser PÚBLICA i decidir si l'usuari ha de crear un compte nou o iniciar sessió.
 */
export async function resolveInvitationAction(token: string) {
    if (!token) {
        return redirect('/login?message=Token d\'invitació invàlid.');
    }

    const supabaseAdmin = createAdminClient();

    const { data: invitation } = await supabaseAdmin
        .from('invitations')
        .select('email')
        .eq('token', token)
        .single();

    if (!invitation) {
        return redirect('/login?message=La teva invitació és invàlida o ha caducat.');
    }

    const invitedEmail = invitation.email;

    // ✅ TORNEM A LA LÒGICA CORRECTA I ROBUSTA
    // 1. Obtenim la llista d'usuaris (pot estar paginada, però per a la majoria de casos és suficient)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
        console.error("Error obtenint la llista d'usuaris:", listError);
        return redirect('/login?message=Hi ha hagut un error al servidor.');
    }

    // 2. Busquem si un usuari amb aquest email ja existeix a la llista
    const existingUser = users.find(u => u.email === invitedEmail);
    
    if (existingUser) {
        // L'usuari JA EXISTEIX. L'enviem a iniciar sessió.
        console.log(`[resolveInvitation] L'usuari ${invitedEmail} ja existeix. Redirigint a login.`);
        redirect(`/login?invite_token=${token}&email=${encodeURIComponent(invitedEmail)}`);
    } else {
        // L'usuari NO EXISTEIX. L'enviem a la pàgina de registre per a convidats.
        console.log(`[resolveInvitation] L'usuari ${invitedEmail} és nou. Redirigint a la pàgina de registre.`);
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
            {
                app_metadata: {
                    ...user.app_metadata,
                    active_team_id: invitation.team_id,
                    active_team_plan: teamPlan
                }
            }
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
 * Revoca una invitació pendent de l'equip ACTIU.
 */
export async function revokeInvitationAction(invitationId: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };
    
    // ✅ LÒGICA CORRECTA: Obtenim l'equip actiu del token.
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { success: false, message: "No tens cap equip actiu seleccionat." };
    }

    // Comprovem el rol de l'usuari a l'equip actiu.
    const { data: currentUserMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('team_id', activeTeamId)
        .single();
    
    if (!currentUserMember) {
        return { success: false, message: "No pertanys a l'equip actiu." };
    }

    const allowedRoles = ['owner', 'admin'];
    if (!allowedRoles.includes(currentUserMember.role)) {
        return { success: false, message: "No tens permisos per a aquesta acció." };
    }
    
    // Assegurem que només s'esborren invitacions de l'equip actiu.
    const { error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)
        .eq('team_id', activeTeamId);

    if (deleteError) {
        return { success: false, message: "Error en revocar la invitació." };
    }
    
    revalidatePath('/settings/team');
    return { success: true, message: "Invitació revocada." };
}


/**
 * Canvia l'equip actiu de l'usuari directament a les seves metadades d'autenticació (JWT).
 */
// ...
/**
 * Canvia l'equip actiu de l'usuari...
 */
export async function switchActiveTeamAction(teamId: string) {
    // AFEGEIX AIXÒ
    console.log("🚀 [SERVER ACTION] Iniciada switchActiveTeamAction amb teamId:", teamId);

    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("❌ [SERVER ACTION] Error: Usuari no autenticat.");
        return { success: false, message: "No autenticat." };
    }

    // Comprovació de seguretat
    const { data: member } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .maybeSingle();

    // AFEGEIX AIXÒ
    console.log("🔐 [SERVER ACTION] Resultat de la comprovació de membre:", member);

    if (!member) {
        console.error("❌ [SERVER ACTION] Error: L'usuari no té accés a l'equip", teamId);
        return { success: false, message: "No tens accés a aquest equip." };
    }

    try {
        const supabaseAdmin = createAdminClient();
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { app_metadata: { active_team_id: teamId } }
        );

        if (error) {
            // AFEGEIX AIXÒ
            console.error("❌ [SERVER ACTION] Error de Supabase en actualitzar metadades:", error.message);
            return { success: false, message: error.message };
        }

        revalidatePath('/', 'layout');

        // AFEGEIX AIXÒ
        console.log("✅ [SERVER ACTION] Èxit! Metadades actualitzades. Retornant success: true.");
        return { success: true };

    } catch (e: unknown) {
        if (e instanceof Error) {
            console.error("💥 [SERVER ACTION] Error inesperat en el bloc try-catch:", e.message);
        } else {
            console.error("💥 [SERVER ACTION] Error inesperat en el bloc try-catch:", e);
        }
        return { success: false, message: "Error inesperat del servidor." };
    }
}
/**
 * Activa o desactiva el permís d'un usuari per a veure la bústia d'un altre.
 */
export async function toggleInboxPermissionAction(targetUserId: string, granteeUserId: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) return { success: false, message: "No hi ha equip actiu." };

    // Comprovació de rol: només owners/admins poden canviar permisos
    const { data: member } = await supabase.from('team_members').select('role').eq('user_id', user.id).eq('team_id', activeTeamId).single();
    if (!['owner', 'admin'].includes(member?.role || '')) {
        return { success: false, message: "No tens permisos per a aquesta acció." };
    }

    try {
        // Mirem si el permís ja existeix
        const { data: existingPermission } = await supabase
            .from('inbox_permissions')
            .select('id')
            .match({ team_id: activeTeamId, grantee_user_id: granteeUserId, target_user_id: targetUserId })
            .maybeSingle();

        if (existingPermission) {
            // Si existeix, l'esborrem
            await supabase.from('inbox_permissions').delete().eq('id', existingPermission.id);
            revalidatePath('/settings/team');
            return { success: true, message: "Permís revocat." };
        } else {
            // Si no existeix, el creem
            await supabase.from('inbox_permissions').insert({
                team_id: activeTeamId,
                grantee_user_id: granteeUserId,
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
/**
 * ✅ NOU: Neteja l'equip actiu, per a tornar al "vestíbul".
 */
/**
 * Neteja l'equip actiu per tornar al vestíbul.
 */
export async function clearActiveTeamAction() {
    console.log("[ACTION] Iniciant neteja de l'equip actiu.");
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { app_metadata: { ...user.app_metadata, active_team_id: null } }
    );

    if (error) {
        console.error("[ACTION] Error de Supabase en netejar l'equip actiu:", error.message);
        return { success: false, message: error.message };
    }
    
    console.log("[ACTION] Equip actiu netejat correctament.");
    revalidatePath('/settings/team', 'page');
    return { success: true };
}