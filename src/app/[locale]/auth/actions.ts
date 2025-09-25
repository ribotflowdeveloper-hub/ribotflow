"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { headers } from 'next/headers';

/**
 * Aquesta acció és cridada DESPRÉS que un usuari ha iniciat sessió o ha verificat el seu email.
 * És el pas final per a unir-se a un equip.
 */
// ✅ CORRECTION: The function now only accepts the token.
export async function acceptInviteAction(token: string, id: string) {
    const supabase = createClient(cookies());
    const supabaseAdmin = createAdminClient();
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';
    
    // 1. Get the currently logged-in user.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        // If there's no user, redirect them to log in, passing the token so they can try again.
        return redirect(`/${locale}/login?invite_token=${token}&message=You must be logged in to accept an invitation.`);
    }

    try {
        // 2. Find the invitation using the admin client to ensure it can be found.
        const { data: invitation } = await supabaseAdmin
            .from('invitations')
            .select('*')
            .eq('token', token)
            .single()
            .throwOnError();
            
        // 3. CRUCIAL SECURITY CHECK: Ensure the logged-in user's email matches the invitation email.
        if (invitation.email !== user.email) {
            throw new Error("This invitation is intended for another user.");
        }

        // 4. Add the user to the team.
        await supabaseAdmin
            .from('team_members')
            .insert({ team_id: invitation.team_id, user_id: user.id, role: invitation.role })
            .throwOnError();
        
        // 5. Instantly update the user's token to make the new team active.
        await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { app_metadata: { 
                ...user.app_metadata, 
                active_team_id: invitation.team_id,
            }}
        );
        
        // 6. Delete the invitation so it can't be used again.
        await supabaseAdmin.from('invitations').delete().eq('id', invitation.id);

    } catch (error) {
        // Gracefully handle if the user is already a member, but still update their token.
        if (error instanceof Error && error.message.includes('duplicate key value')) {
            console.log("User was already a member, proceeding to the dashboard...");
        } else {
            const message = error instanceof Error ? error.message : "Error processing the invitation.";
            return redirect(`/${locale}/dashboard?message=${encodeURIComponent(message)}`);
        }
    }

    // On success, redirect to the dashboard. The middleware will let them pass.
    return redirect(`/${locale}/dashboard`);
}

// --- Acció per iniciar sessió ---
// --- Login Action ---
export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const inviteToken = formData.get('invite_token') as string | null;
    const supabase = createClient(cookies());
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    // Anti-conflict logic: if there's an invite token, first sign out any existing session.
    if (inviteToken) {
        await supabase.auth.signOut();
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        return redirect(`/${locale}/login?message=${encodeURIComponent("Incorrect credentials.")}`);
    }

    // If login is successful and it's part of an invite flow, go accept it.
    if (inviteToken) {
        return redirect(`/accept-invite?token=${inviteToken}`);
    }
    
    // If it's a normal login, go to the dashboard.
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