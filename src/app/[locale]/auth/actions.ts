"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { headers } from 'next/headers';


export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const supabase = createClient(cookies());
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        return redirect(`/${locale}/login?message=${encodeURIComponent("Credencials incorrectes.")}`);
    }
    // Això proporciona la millor experiència d'usuari i evita conflictes amb el middleware.
    redirect(`/${locale}`);

}
export async function logoutAction() {
    const supabase = createClient(cookies());
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    // signOut() s'executa al servidor, esborrant les cookies de manera segura
    await supabase.auth.signOut();

    // Redirigim a la pàgina de login
    // ✅ CORRECCIÓ DEFINITIVA: Redirigim directament al dashboard.
    redirect(`/${locale}/`);
}
export async function signupAction(formData: FormData) {
    const origin = (await headers()).get('origin');
    const email = (formData.get('email') as string).trim().toLowerCase();
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const inviteToken = formData.get('invite_token') as string | null;
    const supabase = createClient(cookies());
    const supabaseAdmin = createAdminClient();
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';

    // ✅ CANVI: Tornem a utilitzar 'listUsers' que sabem que funciona de manera fiable.
    const { data: existingUserData, error: userError } = await supabaseAdmin.auth.admin.listUsers({
        // Podem paginar per si hi ha molts usuaris, però per a la comprovació
        // normalment n'hi haurà 0 o 1 amb el mateix email.
        page: 1,
        perPage: 1,
    });
    
    // Filtrem la llista (encara que només tingui un element) per trobar la coincidència exacta.
    const existingUser = existingUserData?.users.find(u => u.email === email);

    if (userError) {
        return redirect(`/signup?message=${encodeURIComponent("Hi ha hagut un error al servidor.")}`);
    }

    if (existingUser) {
        // Si trobem l'usuari, el redirigim a la pàgina de login.
        const message = "Ja existeix un compte amb aquest correu electrònic. Si us plau, inicia sessió.";
        return redirect(`/${locale}/login?message=${encodeURIComponent(message)}`);
    }

    // Si arribem aquí, l'usuari no existeix i podem procedir amb el registre.
    const nextUrl = inviteToken ? `/dashboard?token=${inviteToken}` : `/onboarding`;

    const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
    });

    if (signUpError) {
        let errorKey = 'unknown_error';
        if (signUpError.message.includes('Password should be at least 6 characters')) {
            errorKey = 'password_length';
        } else if (signUpError.message.includes('email address')) {
            errorKey = 'email_invalid';
        }
        return redirect(`/signup?errorKey=${errorKey}&email=${encodeURIComponent(email)}`);
    }

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

/**
 * Inicia el flux de restabliment de contrasenya.
 * Envia un correu a l'usuari amb un enllaç per a crear una nova contrasenya.
 */
export async function forgotPasswordAction(formData: FormData) {
    const email = formData.get('email') as string;
    const supabase = createClient(cookies());
    const origin = (await headers()).get('origin');
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';
    
    // Aquesta funció de Supabase envia el correu de restabliment
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/${locale}/auth/reset-password`,
    });

    if (error) {
        return redirect(`/${locale}/login?message=${encodeURIComponent("No s'ha pogut iniciar el procés de restabliment.")}`);
    }

    // Per seguretat, sempre mostrem un missatge d'èxit, fins i tot si l'email no existeix.
    return redirect(`/${locale}/login?message=${encodeURIComponent("Si l'email existeix, rebràs un enllaç per a restablir la teva contrasenya.")}`);
}