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
    fullName: z.string().min(1, "El nom complet és obligatori.").optional(), 
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

// --- ✅ CANVI: Definim un tipus de retorn unificat per a les accions d'autenticació ---
// Això permetrà al client gestionar errors sense recarregar la pàgina.
type AuthActionResult = {
  success: boolean;
  message?: string | null;      // Missatge d'error directe
  errorKey?: string | null;     // Clau per a traduccions (i18n)
  email?: string | null;        // Per repoblar el camp email
};


// --- Accions Refactoritzades ---

// ✅ CANVI: La funció ara retorna una Promise<AuthActionResult>
export async function loginAction(formData: FormData): Promise<AuthActionResult> {
    const { supabase, locale } = await createActionContext();
    const email = formData.get('email') as string; // Obtenim l'email abans de validar
    const result = LoginSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
        // ❌ Abans: return redirect(...)
        // ✅ Ara: Retornem un objecte d'error
        return {
            success: false,
            message: result.error.issues[0].message,
            errorKey: 'validation_failed',
            email: email, // Retornem l'email (fins i tot si és invàlid) per mantenir-lo al camp
        };
    }

    const { error } = await supabase.auth.signInWithPassword(result.data);
    if (error) {
        // ❌ Abans: return redirect(...)
        // ✅ Ara: Retornem un objecte d'error
        return {
            success: false,
            message: "Credencials incorrectes.", // Missatge simple
            errorKey: 'invalid_credentials',    // Clau per a i18n al client
            email: result.data.email,         // Retornem l'email validat
        };
    }

    // ✅ Èxit: La redirecció només passa si tot ha anat bé.
    redirect(`/${locale}/dashboard`);
}

// ✅ CANVI: La funció ara retorna una Promise<AuthActionResult>
export async function signupAction(formData: FormData): Promise<AuthActionResult> {
    const { supabase, origin } = await createActionContext();
    const supabaseAdmin = createAdminClient();
    const email = formData.get('email') as string; // Obtenim l'email abans de validar
    const result = SignupSchema.safeParse(Object.fromEntries(formData));

    if (!result.success) {
        // ❌ Abans: return redirect(...)
        // ✅ Ara: Retornem un objecte d'error
        return {
            success: false,
            message: result.error.issues[0].message,
            errorKey: 'validation_failed',
            email: email,
        };
    }

    const { password, fullName, invite_token } = result.data;

    const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', email).single();
    if (existingUser) {
        // ❌ Abans: return redirect(...)
        // ✅ Ara: Retornem un objecte d'error
        return {
            success: false,
            message: "Ja existeix un compte amb aquest correu.",
            errorKey: 'user_exists',
            email: email,
        };
    }

    const nextUrl = invite_token ? `/dashboard?token=${invite_token}` : `/onboarding`;

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
            ...(fullName && { data: { full_name: fullName } })
        },
    });

    if (signUpError) {
        // ❌ Abans: return redirect(...)
        // ✅ Ara: Retornem un objecte d'error
        return {
            success: false,
            message: signUpError.message,
            errorKey: 'signup_failed',
            email: email,
        };
    }
    if (!signUpData.user) {
        // ❌ Abans: return redirect(...)
        // ✅ Ara: Retornem un objecte d'error
        return {
            success: false,
            message: "No s'ha pogut crear l'usuari.",
            errorKey: 'signup_failed_no_user',
            email: email,
        };
    }

    // ✅ Èxit: Redirigim a la pàgina de "comprova el teu email"
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
        // Aquesta redirecció és correcta, ja que el flux OAuth és diferent
        // i no podem retornar un objecte a un formulari que no ha iniciat l'acció.
        return redirect(`/login?message=${encodeURIComponent("No s'ha pogut iniciar sessió amb Google.")}`);
    }
    return redirect(data.url);
}

// ✅ Aquesta funció ja seguia el patró correcte de retornar un objecte.
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