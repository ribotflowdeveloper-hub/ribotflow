"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Resend } from 'resend';
import { validateUserSession } from "@/lib/supabase/session"; // ✅ Utilitzem el teu helper!
import { PERMISSIONS, validateSessionAndPermission, Role } from '@/lib/permissions';

/**
 * Crea un nou equip i les seves dependències de manera transaccional
 * cridant una funció RPC a la base de dades.
 */
export async function createTeamAction(formData: FormData) {
    // 1. Validació d'entrades (això es queda igual)
    const teamName = formData.get('teamName') as string;
    if (!teamName || teamName.trim().length < 2) {
        return { success: false, message: "El nom de l'equip és obligatori." };
    }

    // 2. Validació de sessió (ara amb el teu helper)
    // Necessitem assegurar que hi ha un usuari per a que 'auth.uid()' funcioni a la funció SQL.
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    try {
        // 3. Execució de la transacció
        // Cridem la nostra funció de la base de dades amb un sol 'await'.
        const { error } = await supabase.rpc('create_team_with_defaults', {
            team_name: teamName
        });

        if (error) throw error; // Si hi ha un error, el 'catch' el gestionarà.

    } catch (error: unknown) {
        console.error("Error en la transacció de crear equip:", error);

        let errorMessage = "No s'ha pogut crear l'equip.";
        if (error instanceof Error) {
            errorMessage = `No s'ha pogut crear l'equip: ${error.message}`;
        }
        return { success: false, message: errorMessage };
    }

    // 4. Revalidació i redirecció
    revalidatePath('/settings/team');
    return redirect('/settings/team'); // És bona pràctica retornar el redirect
}
/**
 * Convida un usuari a l'equip ACTIU.
 * Implementa una lògica híbrida:
 * - Si l'usuari ja existeix, crea una invitació interna i envia un email de cortesia.
 * - Si l'usuari no existeix, crea una invitació amb token i envia un email de registre.
 */
export async function inviteUserAction(formData: FormData) {
    // 1. VALIDACIÓ DE PERMISOS
    const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_MEMBERS);
    if ('error' in validation) {
        return { success: false, message: validation.error.message };
    }
    const { user: inviter, activeTeamId, supabase } = validation;

    // 2. VALIDACIÓ D'ENTRADES
    const email = formData.get('email') as string;
    const role = formData.get('role') as Role;
    if (!email || !role) {
        return { success: false, message: "Falten l'email o el rol." };
    }

    try {
        // 3. COMPROVACIÓ DE SEGURETAT: Ja existeix una invitació pendent per a aquest email?
        const { data: existingInvite } = await supabase.from('invitations').select('id').match({ email, team_id: activeTeamId, status: 'pending' }).maybeSingle();
        if (existingInvite) {
            return { success: false, message: "Ja s'ha enviat una invitació a aquest usuari per a aquest equip." };
        }

        // 4. CERCA EFICIENT D'USUARI
        const { data: existingUserId } = await supabase.rpc('get_user_id_by_email', { email_to_check: email });

        // 5. OBTENCIÓ DE DADES COMUNES
        const [teamRes, inviterProfileRes] = await Promise.all([
            supabase.from('teams').select('name').eq('id', activeTeamId).single(),
            supabase.from('profiles').select('full_name').eq('id', inviter.id).single()
        ]);

        if (teamRes.error) throw new Error("L'equip actiu no s'ha trobat.");
        const teamName = teamRes.data.name;
        const inviterName = inviterProfileRes.data?.full_name || inviter.email!;

        // 6. CREACIÓ DE LA INVITACIÓ: La creem sempre i obtenim el token.
        const { data: invitation, error: inviteError } = await supabase
            .from('invitations')
            .insert({
                team_id: activeTeamId,
                email,
                role,
                inviter_name: inviterName,
                team_name: teamName,
                user_id: existingUserId // Si no existeix, serà null, la qual cosa és correcte.
            })
            .select('id, token') // Demanem el token!
            .single();

        if (inviteError) throw inviteError;
        if (!invitation) throw new Error("No s'ha pogut crear la invitació.");

        // 7. LÒGICA D'ENVIAMENT D'EMAIL
        const resend = new Resend(process.env.RESEND_API_KEY);

        if (existingUserId) {
            // --- Cas A: L'usuari JA EXISTEIX ---
            await resend.emails.send({
                from: `Notificació de "${teamName}" <notificacions@elteudomini.com>`,
                to: email,
                subject: `Has estat convidat a unir-te a l'equip ${teamName}`,
                html: `<p>Hola de nou, <strong>${inviterName}</strong> t'ha convidat a l'equip <strong>${teamName}</strong>. Com que ja tens un compte, pots acceptar-la des del teu panell d'equips.</p><div style="text-align: center; margin: 25px 0;"><a href="${process.env.NEXT_PUBLIC_SITE_URL}/settings/team" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Anar al meu panell</a></div>`
            });
        } else {
            // --- Cas B: L'usuari ÉS NOU ---
            // Ara tenim 'invitation.token' disponible.
            await resend.emails.send({
                from: `Invitació de "${teamName}" <invitacions@ribotflow.com>`,
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
                                    <a href="${process.env.NEXT_PUBLIC_SITE_URL}/invitation/accept?token=${invitation.token}" target="_blank" style="background-color: #007bff; color: #ffffff; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">
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

        revalidatePath('/settings/team');
        return { success: true, message: `Invitació enviada a ${email}.` };

    } catch (error: unknown) {
        console.error("Error en el procés d'invitació:", error);
        let errorMessage = "No s'ha pogut enviar la invitació.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }
}
/**
/**
 * Punt d'entrada per a un enllaç d'invitació.
 * Valida el token i redirigeix l'usuari a 'login' o a 'signup'
 * depenent de si ja té un compte.
 */
export async function resolveInvitationAction(token: string) {
    // 1. Validació del token (això ja estava perfecte)
    if (!token) {
        return redirect('/login?message=El token d\'invitació no és vàlid.');
    }

    const supabaseAdmin = createAdminClient();

    const { data: invitation } = await supabaseAdmin
        .from('invitations')
        .select('email')
        .match({ token, status: 'pending' }) // Afegim la comprovació de 'status' per seguretat
        .single();

    if (!invitation) {
        return redirect('/login?message=La teva invitació no és vàlida o ja ha estat utilitzada.');
    }

    const invitedEmail = invitation.email;

    // 2. Comprovació d'usuari (la part refactoritzada)
    // ✅ Substituïm el 'listUsers' per la nostra crida RPC eficient.
    const { data: existingUserId, error: rpcError } = await supabaseAdmin.rpc('get_user_id_by_email', {
        email_to_check: invitedEmail
    });

    if (rpcError) {
        console.error("Error a l'RPC get_user_id_by_email:", rpcError);
        return redirect('/login?message=Hi ha hagut un error al servidor.');
    }

    // 3. Redirecció basada en el resultat
    if (existingUserId) {
        // L'usuari JA EXISTEIX. L'enviem a iniciar sessió.
        console.log(`[resolveInvitation] L'usuari ${invitedEmail} ja existeix. Redirigint a login.`);
        redirect(`/login?invite_token=${token}&email=${encodeURIComponent(invitedEmail)}`);
    } else {
        // L'usuari NO EXISTEIX. L'enviem a la pàgina de registre per a convidats.
        console.log(`[resolveInvitation] L'usuari ${invitedEmail} és nou. Redirigint a la pàgina de registre.`);
        redirect(`/invitation/accept?token=${token}&email=${encodeURIComponent(invitedEmail)}`);
    }
}
/**
 * Processa l'acceptació d'una invitació de manera transaccional.
 * Afegeix l'usuari a l'equip, actualitza el seu token de sessió i neteja la invitació.
 */
export async function acceptInviteAction(token: string) {
    // 1. Validació bàsica de l'usuari
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const locale = user?.user_metadata?.locale || 'ca';

    if (!user) {
        return redirect(`/login?invite_token=${token}&message=Has d'iniciar sessió per acceptar.`);
    }

    try {
        // 2. Execució de la transacció
        // Cridem la nostra funció de la base de dades, que ho fa tot.
        const { error } = await supabase.rpc('accept_invitation_and_set_active_team', {
            invite_token: token
        });

        if (error) throw error;

        // 3. Forcem el refresc del token al costat del client
        // Aquesta és una bona pràctica per assegurar que la UI s'actualitza a l'instant.
        await supabase.auth.refreshSession();

    } catch (error: unknown) {
        let errorMessage = "Error en processar la invitació.";
        if (error instanceof Error) {
            // La funció SQL retorna missatges d'error clars que podem mostrar a l'usuari.
            if (error.message.includes('INVITATION_NOT_FOUND')) {
                errorMessage = "La teva invitació no és vàlida o ja ha estat utilitzada.";
            } else if (error.message.includes('INVITATION_FOR_DIFFERENT_USER')) {
                errorMessage = "Aquesta invitació està destinada a un altre compte de correu.";
            } else {
                errorMessage = error.message;
            }
        }
        console.error("Error a acceptInviteAction:", errorMessage);
        return redirect(`/dashboard?error=${encodeURIComponent(errorMessage)}`);
    }

    // 4. Redirecció final
    // L'usuari ha acceptat la invitació i el seu token ja apunta al nou equip.
    // El redirigim directament al dashboard (o on consideris).
    return redirect(`/${locale}/dashboard?success=Benvingut a l'equip!`);
}
/**
 * Revoca una invitació pendent de l'equip actiu.
 * L'acció només la poden realitzar usuaris amb els permisos adequats.
 */
export async function revokeInvitationAction(invitationId: string) {
    // 1. VALIDACIÓ CENTRALITZADA: Substituïm tot el boilerplate per una sola crida.
    const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_MEMBERS);
    if ('error' in validation) {
        return { success: false, message: validation.error.message };
    }
    // Obtenim el context ja validat.
    const { activeTeamId, supabase } = validation;

    try {
        // 2. EXECUCIÓ DE L'ACCIÓ: La lògica principal no canvia, però ara dins d'un try/catch.
        // La comprovació 'eq('team_id', activeTeamId)' és una capa de seguretat excel·lent.
        const { error } = await supabase
            .from('invitations')
            .delete()
            .match({ id: invitationId, team_id: activeTeamId });

        if (error) throw error;

    } catch (error: unknown) {
        console.error("Error en revocar la invitació:", error);
        let errorMessage = "No s'ha pogut revocar la invitació.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }

    // 3. REVALIDACIÓ I RESPOSTA
    revalidatePath('/settings/team');
    return { success: true, message: "Invitació revocada." };
}
/**
 * Canvia l'equip actiu de l'usuari, actualitzant les metadades del seu token
 * per reflectir el nou context (ID de l'equip i pla de subscripció).
 */
export async function switchActiveTeamAction(teamId: string) {
    // 1. Validació d'usuari: N'hi ha prou amb saber que l'usuari està logat.
    // Usem createClient directament perquè 'validateUserSession' requereix un equip actiu.
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Usuari no autenticat." };
    }

    try {
        // 2. Comprovació de seguretat: L'usuari pertany a l'equip de destí?
        const { data: member } = await supabase
            .from('team_members')
            .select('team_id')
            .match({ user_id: user.id, team_id: teamId })
            .maybeSingle();

        if (!member) {
            return { success: false, message: "No tens accés a aquest equip." };
        }

        // 3. MILLORA CLAU: Obtenim el pla de subscripció del nou equip.
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('team_id', teamId)
            .maybeSingle();

        const newTeamPlan = (subscription?.status === 'active') ? subscription.plan_id : 'free';

        // 4. Actualització del token de l'usuari amb TOT el nou context.
        const supabaseAdmin = createAdminClient();
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            {
                app_metadata: {
                    ...user.app_metadata,
                    active_team_id: teamId,
                    active_team_plan: newTeamPlan // ✅ Afegim el pla
                }
            }
        );

        if (updateError) throw updateError;

    } catch (error: unknown) {
        console.error("Error en canviar d'equip actiu:", error);
        let errorMessage = "No s'ha pogut canviar d'equip.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }

    // 5. Revalidació i èxit
    // Revalidem tot el layout perquè components com la barra de navegació o el menú
    // puguin reaccionar al canvi d'equip.
    revalidatePath('/', 'layout');
    return { success: true };
}
/**
 * Activa o desactiva el permís de l'usuari actual per a veure la bústia d'un altre membre.
 */
export async function toggleInboxPermissionAction(targetUserId: string) { // ✅ NOMÉS UN PARÀMETRE
    // 1. VALIDACIÓ CENTRALITZADA: Comprovem que l'usuari té permisos per a gestionar rols/permisos.
    const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_ROLES);
    if ('error' in validation) {
        return { success: false, message: validation.error.message };
    }
    const { user: granteeUser, activeTeamId, supabase } = validation;

    // L'usuari que fa l'acció no pot donar-se permisos a si mateix per veure la seva pròpia bústia.
    if (granteeUser.id === targetUserId) {
        return { success: false, message: "No pots assignar-te permisos a tu mateix." };
    }

    try {
        // 2. LÒGICA PRINCIPAL: Comprovem si el permís ja existeix.
        const { data: existingPermission } = await supabase
            .from('inbox_permissions')
            .select('id')
            .match({
                team_id: activeTeamId,
                grantee_user_id: granteeUser.id,
                target_user_id: targetUserId
            })
            .maybeSingle();

        if (existingPermission) {
            // Si existeix, l'esborrem.
            const { error } = await supabase.from('inbox_permissions').delete().eq('id', existingPermission.id);
            if (error) throw error;
            revalidatePath('/settings/team');
            return { success: true, message: "Permís revocat." };
        } else {
            // Si no existeix, el creem.
            const { error } = await supabase.from('inbox_permissions').insert({
                team_id: activeTeamId,
                grantee_user_id: granteeUser.id,
                target_user_id: targetUserId
            });
            if (error) throw error;
            revalidatePath('/settings/team');
            return { success: true, message: "Permís concedit." };
        }
    } catch (error: unknown) {
        console.error("Error en canviar el permís de la bústia:", error);
        let errorMessage = "No s'ha pogut actualitzar el permís.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }
}
/**
 * ✅ NOU: Neteja l'equip actiu, per a tornar al "vestíbul".
 */

export async function clearActiveTeamAction() {
    // 1. Validació de sessió amb el teu helper.
    const session = await validateUserSession();
    if ('error' in session) {
        // En aquest cas, si no hi ha usuari, no hi ha res a netejar.
        // Podem retornar èxit o l'error, depenent de la semàntica que prefereixis.
        return { success: false, message: session.error.message };
    }
    const { user } = session;

    try {
        // 2. Execució de l'acció
        const supabaseAdmin = createAdminClient();
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            {
                app_metadata: {
                    ...user.app_metadata,
                    active_team_id: null,
                    active_team_plan: null // ✅ Important netejar també el pla.
                }
            }
        );

        if (error) throw error;

    } catch (error: unknown) {
        console.error("Error en netejar l'equip actiu:", error);
        let errorMessage = "No s'ha pogut sortir de l'equip.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }

    // 3. Revalidació i resposta
    revalidatePath('/settings/team', 'page');
    return { success: true };
}
// A /app/[locale]/(app)/settings/team/actions.ts

/**
 * Permet a un usuari autenticat acceptar una invitació personal des del "lobby".
 * No requereix un equip actiu previ. Tota la lògica s'executa com una transacció.
 */
export async function acceptPersonalInviteAction(invitationId: string) {
    // PAS 1: Validació senzilla. Només necessitem saber qui és l'usuari.
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Has d'iniciar sessió per a acceptar una invitació." };
    }

    try {
        // PAS 2: Execució de la transacció a la base de dades.
        // Cridem la funció RPC que fa tota la feina: valida la invitació,
        // t'afegeix al 'team_members', actualitza el teu 'active_team_id' i esborra la invitació.
        const { error } = await supabase.rpc('accept_personal_invitation', {
            invitation_id: invitationId
        });
        if (error) throw error;

        // PAS 3: Refresquem la sessió per a assegurar-nos que el navegador rep el nou token actualitzat.
        await supabase.auth.refreshSession();

    } catch (error: unknown) {
        console.error("Error en acceptar la invitació personal:", error);
        let errorMessage = "No s'ha pogut acceptar la invitació.";
        if (error instanceof Error && error.message.includes('INVALID_INVITATION')) {
            errorMessage = "Aquesta invitació no és vàlida o ja no està disponible.";
        }
        return { success: false, message: errorMessage };
    }

    // PAS 4: Revalidem la pàgina i retornem l'èxit.
    revalidatePath('/settings/team');
    return { success: true };
}

export async function declinePersonalInviteAction(invitationId: string) {
    // 1. Validació de sessió amb el teu helper.
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { user, supabase } = session;

    try {
        // 2. Execució de l'acció. La teva lògica ja era segura i correcta.
        const { error } = await supabase
            .from('invitations')
            .update({ status: 'declined' })
            .match({ id: invitationId, user_id: user.id }); // Assegura que l'usuari només pot rebutjar les seves pròpies invitacions.

        if (error) throw error;

    } catch (error: unknown) {
        console.error("Error en rebutjar la invitació:", error);
        return { success: false, message: "No s'ha pogut rebutjar la invitació." };
    }

    // 3. Revalidació i resposta
    revalidatePath('/settings/team');
    return { success: true };
}

export async function removeMemberAction(userIdToRemove: string) {
    // 1. VALIDACIÓ DE PERMISOS: Tot el boilerplate desapareix.
    const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_MEMBERS);
    if ('error' in validation) {
        return { success: false, message: validation.error.message };
    }
    const { user: actionUser, activeTeamId, supabase } = validation;

    // 2. VALIDACIONS DE NEGOCI: Aquestes comprovacions són específiques d'aquesta acció.
    if (actionUser.id === userIdToRemove) {
        return { success: false, message: "No et pots eliminar a tu mateix." };
    }

    const { data: team } = await supabase.from('teams').select('owner_id').eq('id', activeTeamId).single();
    if (team?.owner_id === userIdToRemove) {
        return { success: false, message: "No es pot eliminar el propietari de l'equip." };
    }

    // 3. EXECUCIÓ DE L'ACCIÓ
    try {
        const supabaseAdmin = createAdminClient();

        // Eliminem el membre
        const { error: deleteError } = await supabaseAdmin
            .from('team_members')
            .delete()
            .match({ user_id: userIdToRemove, team_id: activeTeamId });

        if (deleteError) throw deleteError;

        // Netegem el token de l'usuari eliminat (aquesta és una pràctica excel·lent!)
        const { data: { user: removedUser } } = await supabaseAdmin.auth.admin.getUserById(userIdToRemove);
        if (removedUser?.app_metadata?.active_team_id === activeTeamId) {
            await supabaseAdmin.auth.admin.updateUserById(userIdToRemove, {
                app_metadata: { ...removedUser.app_metadata, active_team_id: null, active_team_plan: null }
            });
        }
    } catch (error: unknown) {
        console.error("Error en eliminar el membre:", error);
        let errorMessage = "No s'ha pogut eliminar el membre.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }

    // 4. REVALIDACIÓ I RESPOSTA
    revalidatePath('/settings/team');
    return { success: true, message: "Membre eliminat correctament." };
}

// Afegeix aquesta nova acció al teu fitxer actions.ts
export async function updateMemberRoleAction(memberUserId: string, newRole: Role) {
    // 1. VALIDACIÓ DE PERMISOS
    const validation = await validateSessionAndPermission(PERMISSIONS.MANAGE_TEAM_ROLES);
    if ('error' in validation) {
        return { success: false, message: validation.error.message };
    }
    const { activeTeamId, supabase } = validation;

    // 2. VALIDACIONS DE NEGOCI
    if (newRole === 'owner') {
        return { success: false, message: "La propietat de l'equip no es pot assignar, s'ha de transferir mitjançant una altra acció." };
    }

    try {
        const { data: team } = await supabase.from('teams').select('owner_id').eq('id', activeTeamId).single();
        if (team?.owner_id === memberUserId) {
            return { success: false, message: "No es pot canviar el rol del propietari de l'equip." };
        }

        // 3. EXECUCIÓ DE L'ACCIÓ
        const { error } = await supabase
            .from('team_members')
            .update({ role: newRole })
            .match({ user_id: memberUserId, team_id: activeTeamId });

        if (error) throw error;

    } catch (error: unknown) {
        console.error("Error en actualitzar el rol del membre:", error);
        let errorMessage = "No s'ha pogut actualitzar el rol.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, message: errorMessage };
    }

    // 4. REVALIDACIÓ I RESPOSTA
    revalidatePath('/settings/team');
    return { success: true, message: "Rol actualitzat correctament." };
}