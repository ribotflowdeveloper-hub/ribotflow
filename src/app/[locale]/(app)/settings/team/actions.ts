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
        const { data: newTeam, error: teamError } = await supabase
            .from('teams')
            .insert({ name: teamName, owner_id: user.id })
            .select('id')
            .single();
        if (teamError) throw teamError;

        const { error: memberError } = await supabase
            .from('team_members')
            .insert({ team_id: newTeam.id, user_id: user.id, role: 'owner' });
        if (memberError) throw memberError;

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconegut.";
        return { success: false, message };
    }

    redirect('/settings/team');
}

/**
 * Convida un nou usuari a l'equip actual, creant un registre a la taula 'invitations'
 * i enviant un correu electrònic amb Resend.
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
        const { data: memberData } = await supabase
            .from('team_members')
            .select('team_id, teams(name)')
            .eq('user_id', user.id)
            .single();

        if (!memberData || !memberData.teams) {
            return { success: false, message: "No s'ha trobat el teu equip." };
        }
        const teamId = memberData.team_id;
        const teamName = Array.isArray(memberData.teams) && memberData.teams.length > 0 
            ? memberData.teams[0].name 
            : "Nom desconegut";

        const { error: inviteError } = await supabase
            .from('invitations')
            .insert({ team_id: teamId, email, role })
            .select('token')
            .single();
        if (inviteError) throw inviteError;

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: `Invitació de "${teamName}" <invitacions@elteudomini.com>`, // Canvia el teu domini
            to: email,
            subject: `Invitació per unir-te a l'equip ${teamName}`,
            html: `...` // El teu HTML de l'email aquí
        });
        
        revalidatePath('/settings/team');
        return { success: true, message: `Invitació enviada a ${email}.` };

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error en enviar la invitació.";
        return { success: false, message };
    }
}

/**
 * Aquesta acció s'executa quan un usuari FA CLIC a l'enllaç de l'email.
 * La seva única feina és comprovar si l'usuari existeix i redirigir-lo
 * a la pàgina de login o de signup amb la informació necessària.
 */
export async function resolveInvitationAction(token: string) {
    if (!token) {
        return redirect('/login?message=Token d\'invitació invàlid.');
    }

    const supabase = createClient(cookies());
    const { data: invitation } = await supabase
        .from('invitations')
        .select('email')
        .eq('token', token)
        .single();

    if (!invitation) {
        return redirect('/login?message=Invitació invàlida o caducada.');
    }

    const invitedEmail = invitation.email;

    // Utilitzem el client d'administrador per comprovar si l'email ja existeix a Supabase Auth
    const supabaseAdmin = createAdminClient();
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = Array.isArray(users) ? users.find(u => u.email === invitedEmail) : undefined;

    if (user) {
        // L'usuari SÍ existeix -> el portem a INICIAR SESSIÓ
        redirect(`/login?invite_token=${token}&email=${encodeURIComponent(invitedEmail)}`);
    } else {
        // L'usuari NO existeix -> el portem a REGISTRAR-SE
        redirect(`/signup?invite_token=${token}&email=${encodeURIComponent(invitedEmail)}`);
    }
}


/**
 * Aquesta acció s'executa DESPRÉS que un usuari hagi iniciat sessió o s'hagi registrat.
 * AFEGEIX l'usuari a l'equip i ESBORRA la invitació.
 */
export async function acceptInviteAction(token: string) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect(`/login?invite_token=${token}&message=Has d'iniciar sessió per acceptar.`);
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
            .insert({ team_id: invitation.team_id, user_id: user.id, role: invitation.role });

        if (memberError && memberError.code !== '23505') { // Ignorem l'error si ja és membre
            throw memberError;
        }
        
        await supabase.from('invitations').delete().eq('id', invitation.id);

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error en processar la invitació.";
        return redirect(`/dashboard?message=${encodeURIComponent(message)}`);
    }

    redirect('/settings/team');
}

/**
 * Elimina una invitació pendent.
 */
export async function revokeInvitationAction(invitationId: string) {
    const supabase = createClient(cookies());
    await supabase.from('invitations').delete().eq('id', invitationId);
    revalidatePath('/settings/team');
}