// /app/auth/actions.ts

"use server";

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { acceptInviteAction } from '@/app/[locale]/(app)/settings/team/actions'; // Asegúrate de que la ruta sea correcta

// --- Acción para iniciar sesión con email y contraseña ---
export async function loginAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const supabase = createClient(cookies());

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return redirect(`/login?message=${encodeURIComponent("Credenciales incorrectas.")}`);
    }
    
    // El middleware se encargará de redirigir al onboarding o al dashboard
    return redirect('/');
}

// --- Acción para registrar un nuevo usuario ---
export async function signupAction(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const inviteToken = formData.get('invite_token') as string;
    const supabase = createClient(cookies());

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            // Esta URL será a la que se envíe el email de confirmación
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
    });

    if (signUpError) {
        return redirect(`/signup?message=${encodeURIComponent(signUpError.message)}`);
    }

    // Si Supabase requiere que el usuario verifique su email, la sesión no se creará
    // inmediatamente. Mostramos un mensaje para que revise su correo.
    if (!signUpData.session) {
        return redirect('/login?message=Revisa tu email para completar el registro.');
    }
    
    // Si el registro crea la sesión directamente Y veníamos de una invitación
    if (inviteToken) {
        // La acción se encarga de añadir al equipo y redirigir a /settings/team
        return await acceptInviteAction(inviteToken);
    }

    // Si no hay invitación, el middleware gestionará la redirección a /onboarding
    return redirect('/');
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