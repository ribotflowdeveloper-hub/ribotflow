"use server";

import { createClient } from "@/lib/supabase/server";
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

    // El callback s'encarregarà de la resta
    return redirect(`/${locale}/dashboard`);
}

export async function signupAction(formData: FormData) {
    const origin = (await headers()).get('origin');
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const inviteToken = formData.get('invite_token') as string | null;
    const supabase = createClient(cookies());

    // El 'next' li diu al callback on ha d'anar l'usuari DESPRÉS de verificar l'email.
    const nextUrl = inviteToken ? `/dashboard?token=${inviteToken}` : `/onboarding`;

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
    });

    if (error) {
        return redirect(`/signup?message=${encodeURIComponent("No s'ha pogut completar el registre.")}`);
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