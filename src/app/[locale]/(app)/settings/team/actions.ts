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
 * Convida un usuari a l'equip ACTIU.
 * Implementa una lògica híbrida:
 * - Si l'usuari ja existeix, crea una invitació interna i envia un email de cortesia.
 * - Si l'usuari no existeix, crea una invitació amb token i envia un email de registre.
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
    const supabaseAdmin = createAdminClient(); // Necessitem l'admin per buscar usuaris
    const { data: { user: inviter } } = await supabase.auth.getUser();

    if (!inviter) {
        console.error("[ACTION ERROR] Usuari no autenticat.");
        return { success: false, message: "No autenticat." };
    }
    console.log(`[ACTION] Usuari autenticat (qui convida): ${inviter.id}`);

    const activeTeamId = inviter.app_metadata?.active_team_id;
    if (!activeTeamId) {
        console.error("[ACTION ERROR] L'usuari que convida no té un equip actiu seleccionat al seu token.");
        return { success: false, message: "No s'ha pogut determinar l'equip actiu." };
    }
    console.log(`[ACTION] Equip actiu obtingut del token: ${activeTeamId}`);

    try {
        // --- Inici de la Lògica Híbrida ---

        console.log(`[ACTION] Comprovant si l'usuari amb email ${email} ja existeix...`);
        // NOTA: listUsers és una opció, però pot ser lent. Si tens molts usuaris, considera altres estratègies.
        // Per ara, és una solució funcional.
        const { data: allUsers, error: userError } = await supabaseAdmin.auth.admin.listUsers();
        const existingUserData = allUsers?.users.filter(user => user.email === email);
        if (userError) {
             console.error("[ACTION ADMIN ERROR] Error en buscar l'usuari:", userError);
             throw userError;
        }
        
        const invitedUser = existingUserData?.[0] || null;

        // --- Preparació de dades comunes (per a ambdós casos) ---

        console.log(`[ACTION] Obtenint dades de l'equip ${activeTeamId}...`);
        const { data: teamData } = await supabase.from('teams').select('name').eq('id', activeTeamId).single();
        if (!teamData) throw new Error("L'equip actiu no s'ha trobat a la base de dades.");
        const teamName = teamData.name;
        console.log(`[ACTION] Nom de l'equip obtingut: ${teamName}`);

        console.log(`[ACTION] Obtenint el perfil de qui convida: ${inviter.id}...`);
        const { data: inviterProfile } = await supabase.from('profiles').select('full_name').eq('id', inviter.id).single();
        const inviterName = inviterProfile?.full_name || inviter.email;
        console.log(`[ACTION] Nom de qui convida: ${inviterName}`);
        
        const resend = new Resend(process.env.RESEND_API_KEY);

        // --- Cas A: L'usuari SÍ existeix ---
        if (invitedUser) {
            console.log(`[ACTION] L'usuari ${email} ja existeix (ID: ${invitedUser.id}). Creant invitació interna.`);
            
            await supabase.from('invitations').insert({
                team_id: activeTeamId,
                email: email,
                role: role,
                inviter_name: inviterName,
                team_name: teamName,
                user_id: invitedUser.id // ✅ El pas clau: vinculem la invitació a l'ID de l'usuari existent
            }).throwOnError();

            console.log("[ACTION] Enviant email de cortesia (notificació) a l'usuari existent...");
            await resend.emails.send({
                from: `Notificació de "${teamName}" <notificacions@ribotflow.com>`,
                to: email,
                subject: `Has estat convidat a unir-te a l'equip ${teamName}`,
                html: `<p>Hola de nou,</p><p><strong>${inviterName}</strong> t'ha convidat a unir-te al seu equip <strong>${teamName}</strong>.</p><p>Com que ja tens un compte, pots acceptar o rebutjar la invitació directament des del teu panell d'equips dins de la plataforma.</p><div style="text-align: center; margin: 25px 0;"><a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings/team" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Anar al meu panell</a></div>`
            });

        // --- Cas B: L'usuari NO existeix ---
        } else {
            console.log(`[ACTION] L'usuari ${email} és nou. Creant invitació amb token.`);
            
            const { data: invitation, error: inviteError } = await supabase
                .from('invitations')
                .insert({
                    team_id: activeTeamId,
                    email,
                    role,
                    inviter_name: inviterName,
                    team_name: teamName
                })
                .select('token')
                .single();

            if (inviteError) {
                console.error("[ACTION DB ERROR] Error en inserir la invitació:", inviteError);
                throw inviteError;
            }
            console.log("[ACTION] Invitació inserida correctament.");
            
            console.log("[ACTION] Enviant email d'invitació i registre a l'usuari nou...");
            await resend.emails.send({
                from: `Invitació de "${teamName}" <invitacions@ribotflow.com>`,
                to: email,
                subject: `Has estat convidat a unir-te a l'equip ${teamName}`,
                // He copiat el teu HTML exacte
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
        }
        
        console.log("[ACTION] Procés d'invitació finalitzat. Revalidant path...");
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
        await supabase.auth.refreshSession();

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
 * Activa o desactiva el permís de l'usuari actual per a veure la bústia d'un altre membre.
 */
export async function toggleInboxPermissionAction(targetUserId: string) { // ✅ NOMÉS UN PARÀMETRE
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) return { success: false, message: "No hi ha equip actiu." };

    // L'usuari que fa l'acció (grantee) és sempre l'usuari autenticat.
    const granteeUserId = user.id;

    // Comprovació de rol: només owners/admins poden canviar permisos
    const { data: member } = await supabase.from('team_members').select('role').eq('user_id', granteeUserId).eq('team_id', activeTeamId).single();
    if (!['owner', 'admin'].includes(member?.role || '')) {
        return { success: false, message: "No tens permisos per a aquesta acció." };
    }

    try {
        const { data: existingPermission } = await supabase
            .from('inbox_permissions')
            .select('id')
            .match({ team_id: activeTeamId, grantee_user_id: granteeUserId, target_user_id: targetUserId })
            .maybeSingle();

        if (existingPermission) {
            await supabase.from('inbox_permissions').delete().eq('id', existingPermission.id);
            revalidatePath('/settings/team');
            return { success: true, message: "Permís revocat." };
        } else {
            await supabase.from('inbox_permissions').insert({
                team_id: activeTeamId,
                grantee_user_id: granteeUserId, // Sempre l'usuari actual
                target_user_id: targetUserId   // L'usuari de la llista
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


// A /app/[locale]/(app)/settings/team/actions.ts

export async function acceptPersonalInviteAction(invitationId: string) {
    const supabase = createClient(cookies());
    const supabaseAdmin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    const { data: invitation } = await supabaseAdmin.from('invitations').select('*').eq('id', invitationId).single();
    if (!invitation || invitation.user_id !== user.id) {
        return { success: false, message: "Invitació invàlida." };
    }

    try {
        // Afegeix a l'equip
        await supabaseAdmin.from('team_members').insert({ 
            team_id: invitation.team_id, 
            user_id: user.id, 
            role: invitation.role 
        });

        // Canvi de context i actualització del token
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            app_metadata: { ...user.app_metadata, active_team_id: invitation.team_id }
        });
        
        // Forcem la renovació del token!
        await supabase.auth.refreshSession();

        // ✅ LÍNIA AFEGIDA: Esborrem la invitació un cop processada.
        await supabaseAdmin.from('invitations').delete().eq('id', invitation.id);
    
    } catch (error) {
        // Ignorem l'error si l'usuari ja era membre, però continuem el procés
        if (error instanceof Error && error.message.includes('duplicate key value')) {
            console.log("L'usuari ja era membre, procedint igualment...");
        } else {
            // Si és un altre tipus d'error, el llancem
            const message = error instanceof Error ? error.message : "Error en acceptar la invitació.";
            return { success: false, message: message };
        }
    }
    
    return { success: true };
}

export async function declinePersonalInviteAction(invitationId: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "No autenticat." };

    const { error } = await supabase
        .from('invitations')
        .update({ status: 'declined' })
        .match({ id: invitationId, user_id: user.id }); // Seguretat: només pot rebutjar les seves

    if (error) return { success: false, message: "No s'ha pogut rebutjar la invitació." };
    revalidatePath('/settings/team');
    return { success: true };
}



export async function removeMemberAction(userIdToRemove: string) {
    console.log(`[ACTION] Iniciant removeMemberAction per a l'usuari: ${userIdToRemove}`);
    const supabase = createClient(cookies());
    const supabaseAdmin = createAdminClient();

    // --- Validacions de Seguretat ---

    // 1. Qui està realitzant aquesta acció?
    const { data: { user: actionUser } } = await supabase.auth.getUser();
    if (!actionUser) {
        return { success: false, message: "No autenticat." };
    }

    // 2. A quin equip pertany l'usuari que fa l'acció?
    const activeTeamId = actionUser.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return { success: false, message: "No tens cap equip actiu seleccionat." };
    }

    // 3. L'usuari que fa l'acció té permisos per eliminar membres en aquest equip?
    const { data: actionUserMember } = await supabase
        .from('team_members')
        .select('role')
        .match({ user_id: actionUser.id, team_id: activeTeamId })
        .single();

    if (!['owner', 'admin'].includes(actionUserMember?.role || '')) {
        return { success: false, message: "No tens permisos per eliminar membres." };
    }

    // 4. No es pot eliminar a un mateix amb aquesta acció.
    if (actionUser.id === userIdToRemove) {
        return { success: false, message: "No et pots eliminar a tu mateix." };
    }

    // 5. No es pot eliminar al propietari de l'equip.
    const { data: targetMember } = await supabase
        .from('team_members')
        .select('role')
        .match({ user_id: userIdToRemove, team_id: activeTeamId })
        .single();
        
    if (targetMember?.role === 'owner') {
        return { success: false, message: "No es pot eliminar el propietari de l'equip." };
    }

    // --- Execució de l'Acció ---

    try {
        // 6. Eliminem el membre de la taula team_members
        const { error: deleteError } = await supabaseAdmin
            .from('team_members')
            .delete()
            .match({ user_id: userIdToRemove, team_id: activeTeamId });

        if (deleteError) throw deleteError;
        console.log(`[ACTION] Usuari ${userIdToRemove} eliminat de l'equip ${activeTeamId}.`);

        // 7. [PAS CLAU DE UX] Netegem l'estat del token de l'usuari eliminat.
        // Això evita que l'usuari eliminat es quedi "atrapat" en un equip al qual ja no pertany.
        const { data: { user: removedUser } } = await supabaseAdmin.auth.admin.getUserById(userIdToRemove);
        if (removedUser?.app_metadata?.active_team_id === activeTeamId) {
            console.log(`[ACTION] Netejant active_team_id per a l'usuari eliminat...`);
            await supabaseAdmin.auth.admin.updateUserById(userIdToRemove, {
                app_metadata: { ...removedUser?.app_metadata, active_team_id: null, active_team_plan: null }
            });
        }
        
    } catch (error) {
        const message = error instanceof Error ? error.message : "Error en eliminar el membre.";
        console.error("💥 [ACTION CATCH] S'ha produït un error a removeMemberAction:", message);
        return { success: false, message };
    }

    revalidatePath('/settings/team');
    return { success: true, message: "Membre eliminat correctament." };
}