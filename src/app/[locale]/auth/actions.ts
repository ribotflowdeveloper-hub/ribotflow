"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { headers } from 'next/headers';

// ✅ PAS 1: MOVEM L'ACCIÓ 'acceptInviteAction' AQUÍ
// Té més sentit que estigui juntament amb la resta de la lògica d'autenticació.
async function acceptInviteAction(token: string, userId: string) {
    const supabaseAdmin = createAdminClient();

    // 1. Busquem la invitació per obtenir el team_id i el rol
    const { data: invitation, error: invitationError } = await supabaseAdmin
        .from('invitations')
        .select('team_id, role, email')
        .eq('token', token)
        .single();

    if (invitationError || !invitation) {
        console.error("Error: Invitació invàlida o no trobada", invitationError);
        // Retornem un error en lloc de redirigir per a que la funció principal ho gestioni
        throw new Error("Invitació invàlida o caducada.");
    }

    // 2. Afegim l'usuari a la taula de membres
    const { error: insertError } = await supabaseAdmin
        .from('team_members')
        .insert({ team_id: invitation.team_id, user_id: userId, role: invitation.role });

    if (insertError && !insertError.message.includes('duplicate key value')) {
        console.error("Error en inserir el nou membre:", insertError);
        throw insertError;
    }

    // 3. ✅ PAS CLAU: Actualitzem el token de l'usuari a l'instant
    // Establim l'equip de la invitació com el seu equip actiu.
    await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
            app_metadata: {
                active_team_id: invitation.team_id,
            }
        }
    );

    // 4. Esborrem la invitació
    await supabaseAdmin.from('invitations').delete().eq('token', token);
    console.log(`Usuari ${userId} afegit correctament a l'equip ${invitation.team_id} i token actualitzat.`);
}

// --- Acció per iniciar sessió ---
export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const inviteToken = formData.get('invite_token') as string | null;
    const supabase = createClient(cookies());
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    // ✅ LÒGICA ANTI-CONFLICTE: Si hi ha un token d'invitació, primer tanquem qualsevol sessió existent.
    if (inviteToken) {
        await supabase.auth.signOut();
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
        return redirect(`/${locale}/login?message=${encodeURIComponent("Credencials incorrectes.")}`);
    }

    if (inviteToken && signInData.user) {
        try {
            await acceptInviteAction(inviteToken, signInData.user.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error en acceptar la invitació.";
            return redirect(`/${locale}/login?message=${encodeURIComponent(message)}`);
        }
    }

    return redirect(`/${locale}/dashboard`);
}


// --- Acció per registrar un nou usuari ---
export async function signupAction(formData: FormData) {
    const origin = (await headers()).get('origin');
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const inviteToken = formData.get('invite_token') as string | null;
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // ✅ AQUESTA ÉS LA LÒGICA CORRECTA I FINAL
    // El 'next' li diu a la ruta /auth/callback on ha d'anar l'usuari DESPRÉS de verificar l'email.
    const nextUrl = inviteToken
        ? `/accept-invite?token=${inviteToken}`
        : `/onboarding`;

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
    });

    if (error) {
        return redirect(`/signup?message=${encodeURIComponent("No s'ha pogut completar el registre.")}`);
    }

    // Després del registre, sempre enviem a la pàgina de "Verifica el teu email".
    return redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

// --- Acció per a OAuth (Google, etc.) ---
export async function googleAuthAction(inviteToken?: string | null) {
    const supabase = createClient(cookies());
    const origin = (await headers()).get('origin');

    // ✅ LÒGICA ANTI-CONFLICTE: Si hi ha un token d'invitació, primer tanquem qualsevol sessió existent.
    if (inviteToken) {
        await supabase.auth.signOut();
    }

    let redirectTo = `${origin}/auth/callback`;
    if (inviteToken) {
        redirectTo += `?next=/accept-invite?token=${inviteToken}`;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
    });

    if (error) {
        return redirect(`/login?message=${encodeURIComponent("No s'ha pogut iniciar sessió amb Google.")}`);
    }

    return redirect(data.url);
}