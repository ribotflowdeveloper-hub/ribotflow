// src/app/auth/callback/route.ts

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // ✅ NOU PAS CRUCIAL: Un cop la sessió és vàlida, obtenim les dades i les desem.
      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.provider_refresh_token) {
        // Preparem les dades per a la nostra taula personalitzada
        const credentialData = {
          user_id: session.user.id,
          provider: session.user.app_metadata.provider,
          refresh_token: session.provider_refresh_token,
        };

        // Fem un 'upsert' per si l'usuari ja tenia una credencial d'aquest proveïdor
        const { error: upsertError } = await supabase
          .from('user_credentials')
          .upsert(credentialData, { onConflict: 'user_id, provider' });
        
        if (upsertError) {
          console.error("Error en desar la credencial a user_credentials:", upsertError);
          // Opcional: redirigir amb un error específic
        }
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si hi ha un error, retornem a la pàgina de login.
  console.error("Error en el callback d'autenticació:", searchParams.get('error_description'));
  return NextResponse.redirect(`${origin}/login?error=Authentication failed`);
}