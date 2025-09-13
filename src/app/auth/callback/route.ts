import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const cookieStore = cookies();

  // --- PAS 1: Gestió d'errors rebuts des del proveïdor OAuth ---
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  // ✅ CORRECCIÓ: S'ha corregit la errata de 'search_params_get' a 'searchParams.get'
  const errorDescription = searchParams.get('error_description');

  if (error || errorCode || errorDescription) {
    console.error(`Error en el callback d'OAuth: ${errorDescription || 'Error desconegut'}`);
    
    if (errorCode === 'identity_already_exists' || (errorDescription && errorDescription.includes('Identity is already linked'))) {
      return NextResponse.redirect(`${origin}/settings/integrations?error=identity_exists`);
    }

    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // --- PAS 2: Si no hi ha errors, intercanviem el codi per una sessió ---
  if (code) {
    const supabase = createClient(cookieStore);
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // --- PAS 3: Mirem si és un flux de VINCULACIÓ o de LOGIN ---
      const provider = (await cookieStore).get('oauth_provider')?.value;
      
      if (provider) {
        // ✅ ÉS UN FLUX DE VINCULACIÓ (des d'Integracions)
        // Neteja: Esborrem la cookie per seguretat.
        (await
          // ✅ ÉS UN FLUX DE VINCULACIÓ (des d'Integracions)
          // Neteja: Esborrem la cookie per seguretat.
          cookieStore).delete('oauth_provider');

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.provider_refresh_token) {
          const credentialData = {
            user_id: session.user.id,
            provider: provider, 
            refresh_token: session.provider_refresh_token,
          };

          const { error: upsertError } = await supabase
            .from('user_credentials')
            .upsert(credentialData, { onConflict: 'user_id, provider' });
            
          if (upsertError) {
            console.error("Error en desar la credencial a user_credentials:", upsertError);
            return NextResponse.redirect(`${origin}/settings/integrations?error=credential_save_failed`);
          }
        }
      } 
      // Si la cookie 'provider' no existeix, entenem que és un flux de LOGIN/SIGNUP normal
      // i no cal fer res més, només redirigir.

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Error en intercanviar el codi per una sessió:", exchangeError.message);
  }

  // --- PAS 4: Si alguna cosa inesperada falla, redirigim a login ---
  return NextResponse.redirect(`${origin}/login?error=unknown_auth_error`);
}

