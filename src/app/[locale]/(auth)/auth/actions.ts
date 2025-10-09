// /app/[locale]/auth/actions.ts

"use server";

import { z } from 'zod';
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// ✅ PRINCIPI DRY: Un helper per a inicialitzar el context de l'acció
async function createActionContext() {
    const supabase = createClient();
    const headersList = await headers();
    const locale = headersList.get('x-next-intl-locale') || 'ca';
    const origin = headersList.get('origin');
    return { supabase, locale, origin };
}

// --- Esquemes de Validació amb Zod ---
const LoginSchema = z.object({
    email: z.string().email("L'adreça d'email no és vàlida."),
    password: z.string().min(1, "La contrasenya és obligatòria."),
});

const SignupSchema = z.object({
    email: z.string().email("L'adreça d'email no és vàlida."),
    password: z.string().min(8, "La contrasenya ha de tenir almenys 8 caràcters."),
    invite_token: z.string().optional(),
});

const ForgotPasswordSchema = z.object({
    email: z.string().email("Si us plau, introdueix una adreça d'email vàlida."),
});

const UpdatePasswordSchema = z.object({
    password: z.string().min(8, "La nova contrasenya ha de tenir almenys 8 caràcters."),
    code: z.string().min(1, "Falta el token de restabliment."),
});


// --- Accions Refactoritzades ---

export async function loginAction(formData: FormData) {
    const { supabase, locale } = await createActionContext();
    const result = LoginSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
        return redirect(`/${locale}/login?message=${encodeURIComponent(result.error.issues[0].message)}`);
    }
    
    const { error } = await supabase.auth.signInWithPassword(result.data);
    if (error) {
        return redirect(`/${locale}/login?message=${encodeURIComponent("Credencials incorrectes.")}`);
    }
    
    redirect(`/${locale}/dashboard`);
}

export async function signupAction(formData: FormData) {
    const { supabase, locale, origin } = await createActionContext();
    const supabaseAdmin = createAdminClient();
    const result = SignupSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
        return redirect(`/${locale}/signup?message=${encodeURIComponent(result.error.issues[0].message)}`);
    }
    
    const { email, password, invite_token } = result.data;
    
    // La teva lògica per comprovar si l'usuari existeix és bona, la mantenim
    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    if (existingUser) {
        return redirect(`/${locale}/login?message=${encodeURIComponent("Ja existeix un compte amb aquest correu.")}`);
    }

    const nextUrl = invite_token ? `/dashboard?token=${invite_token}` : `/onboarding`;
    const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
    });

    if (signUpError) {
        return redirect(`/${locale}/signup?message=${encodeURIComponent(signUpError.message)}`);
    }

    return redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function logoutAction() {
    const { supabase, locale } = await createActionContext();
    await supabase.auth.signOut();
    redirect(`/${locale}/login`);
}

export async function googleAuthAction(inviteToken?: string | null) {
    const { supabase, origin } = await createActionContext();
    if (inviteToken) {
        await supabase.auth.signOut();
    }
    let redirectTo = `${origin}/auth/callback`;
    if (inviteToken) {
        redirectTo += `?next=/dashboard?token=${inviteToken}`;
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

export async function forgotPasswordAction(formData: FormData): Promise<{ success: boolean; message: string }> {
    const { supabase, origin, locale } = await createActionContext();
    const result = ForgotPasswordSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
        return { success: false, message: result.error.issues[0].message };
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
        redirectTo: `${origin}/${locale}/auth/reset-password`,
    });

    if (error) {
        console.error("Error en restablir la contrasenya:", error);
        return { success: false, message: "No s'ha pogut iniciar el procés de restabliment." };
    }

    return { success: true, message: "Si l'email existeix, rebràs un enllaç per a restablir la teva contrasenya." };
}

// ✅ Aquesta és la nova acció que hem mogut des del component de pàgina
export async function updatePasswordAction(formData: FormData) {
    const { supabase, locale } = await createActionContext();
    const result = UpdatePasswordSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
        return redirect(`/${locale}/auth/reset-password?message=${encodeURIComponent(result.error.issues[0].message)}`);
    }
    
    const { code, password } = result.data;

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
        return redirect(`/${locale}/auth/reset-password?message=L'enllaç de restabliment és invàlid o ha caducat.`);
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
        return redirect(`/${locale}/auth/reset-password?message=${encodeURIComponent(updateError.message)}`);
    }
    
    return redirect(`/${locale}/login?message=La teva contrasenya s'ha actualitzat correctament.`);
}