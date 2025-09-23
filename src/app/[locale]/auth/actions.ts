// /app/auth/actions.ts

"use server";

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { acceptInviteAction } from '@/app/[locale]/(app)/settings/team/actions'; // Asegúrate de que la ruta sea correcta

// --- Acció per iniciar sessió amb email i contraseña (CORREGIDA I FINAL) ---
export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const inviteToken = formData.get('invite_token') as string;
    const supabase = createClient(cookies());
    const locale = (await headers()).get('x-next-intl-locale') || 'ca'; // Obtenim el locale

    // 1. Intentem iniciar sessió
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
        // Redirigim amb el locale per evitar URLs trencades
        return redirect(`/${locale}/login?message=${encodeURIComponent("Credenciales incorrectas.")}`);
    }

    // 2. Si hi ha un token d'invitació, processem la invitació
    if (inviteToken && signInData.user) {
        // Cridem l'acció passant el token I l'ID de l'usuari que acaba d'iniciar sessió
        await acceptInviteAction(inviteToken, signInData.user.id);
        
        // Redirigim al dashboard amb el locale correcte.
        // La lògica de DashboardData s'encarregarà de la resta.
        return redirect(`/${locale}/dashboard`);
    }

    // Si no hi ha token, és un login normal. Redirigim amb locale.
    return redirect(`/${locale}/dashboard`);
}

// --- Acció per registrar un nou usuari (VERSIÓ FINAL) ---
export async function signupAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const inviteToken = formData.get('invite_token') as string;
    const supabase = createClient(cookies());

    // Construeix la URL de retorn per al correu de verificació
    let emailRedirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
    if (inviteToken) {
        const nextUrl = new URL(emailRedirectTo);
        // Després de verificar, el callback redirigirà a /dashboard.
        // L'acceptació de la invitació ja s'haurà fet.
        nextUrl.searchParams.append('next', `/dashboard`);
        emailRedirectTo = nextUrl.toString();
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo },
    });

    if (signUpError) {
        const redirectUrl = inviteToken 
            ? `/invitation/accept?invite_token=${inviteToken}&email=${encodeURIComponent(email)}&message=${encodeURIComponent(signUpError.message)}`
            : `/signup?message=${encodeURIComponent(signUpError.message)}`;
        return redirect(redirectUrl);
    }

    // Si el registre ha creat un usuari (abans de la verificació),
    // podem vincular-lo a l'equip immediatament.
    if (inviteToken && signUpData.user) {
        await acceptInviteAction(inviteToken, signUpData.user.id);
    }
    
    // Finalment, el portem a la pàgina d'espera de verificació.
    return redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}
// --- Acción para iniciar sesión o registrarse con Google ---
export async function googleAuthAction(inviteToken?: string | null) {
    const supabase = createClient(cookies());
    const origin = (await headers()).get('origin');

    let redirectTo = `${origin}/auth/callback`;

    // Si estem en un flux d'invitació, ens assegurem que després del login
    // es completi el procés d'acceptació.
    if (inviteToken) {
        redirectTo += `?next=/accept-invite?token=${inviteToken}`;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
    });


    if (error) {
        return redirect(`/login?message=${encodeURIComponent("No se ha podido iniciar sesión con Google.")}`);
    }

    return redirect(data.url);
}