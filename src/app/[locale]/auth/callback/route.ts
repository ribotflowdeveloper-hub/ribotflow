// /app/auth/callback/route.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // Si venim d'una invitació, 'next' serà '/accept-invite?token=...'
    // Si és un login/signup normal, serà '/' per defecte.
    const next = searchParams.get('next') ?? '/'; 

    if (code) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Un cop l'usuari està autenticat, el redirigim a la seva destinació.
            // Si 'next' és '/', el middleware el portarà al dashboard.
            // Si 'next' és '/accept-invite', el portarà allà.
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Si hi ha un error, tornem al login.
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}