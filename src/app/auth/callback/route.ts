/**
 * @file route.ts (Auth Callback)
 * @summary Aquest fitxer defineix una "Route Handler" de Next.js. És un punt d'API al servidor
 * que gestiona la redirecció des dels proveïdors d'autenticació externs (Google, Microsoft, etc.).
 * La seva funció és rebre el codi d'autorització, intercanviar-lo per una sessió d'usuari
 * vàlida, i gestionar la lògica posterior, com desar credencials o redirigir l'usuari.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Aquesta funció s'executa per a peticions GET a /auth/callback
export async function GET(request: Request) {
  // Extraiem els paràmetres de la URL i l'origen de la petició.
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code'); // El codi d'autorització del proveïdor OAuth.
  const next = searchParams.get('next') ?? '/dashboard'; // La pàgina a la qual redirigir després de l'èxit.
  const cookieStore = cookies();

  // --- PAS 1: Gestió d'errors rebuts directament des del proveïdor OAuth ---
  // Si el proveïdor (Google, Microsoft) retorna un error, aquest vindrà a la URL.
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  if (error || errorCode || errorDescription) {
    console.error(`Error en el callback d'OAuth: ${errorDescription || 'Error desconegut'}`);
    
    // Cas específic: Si l'error és que la identitat ja està vinculada a un altre usuari,
    // redirigim a la pàgina d'integracions amb un missatge d'error clar.
    if (errorCode === 'identity_already_exists' || (errorDescription && errorDescription.includes('Identity is already linked'))) {
      return NextResponse.redirect(`${origin}/settings/integrations?error=identity_exists`);
    }

    // Per a qualsevol altre error d'autenticació, redirigim a la pàgina de login.
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // --- PAS 2: Si no hi ha errors i tenim un codi, l'intercanviem per una sessió ---
  if (code) {
    const supabase = createClient(cookieStore);
    // Aquesta funció de Supabase intercanvia el codi d'un sol ús per una sessió d'usuari vàlida,
    // gestionant automàticament la creació o l'actualització de l'usuari a 'auth.users'.
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // --- PAS 3: LÒGICA CLAU - Diferenciem entre un flux de VINCULACIÓ i un de LOGIN ---
      // Comprovem si existeix la cookie 'oauth_provider' que vam crear a les Server Actions d'integracions.
      const provider = (await cookieStore).get('oauth_provider')?.value;
      
      if (provider) {
        // ✅ SI LA COOKIE EXISTEIX, ÉS UN FLUX DE VINCULACIÓ (des d'Integracions)
        // Neteja: És crucial esborrar la cookie un cop l'hem llegit per evitar que afecti
        // futurs inicis de sessió i per seguretat.
        (await
          // ✅ SI LA COOKIE EXISTEIX, ÉS UN FLUX DE VINCULACIÓ (des d'Integracions)
          // Neteja: És crucial esborrar la cookie un cop l'hem llegit per evitar que afecti
          // futurs inicis de sessió i per seguretat.
          cookieStore).delete('oauth_provider');

        // Obtenim la sessió actualitzada, que ara contindrà el 'provider_refresh_token' del nou proveïdor.
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.provider_refresh_token) {
          const credentialData = {
            user_id: session.user.id,
            provider: provider, // Utilitzem el valor de la cookie, que és 100% fiable.
            refresh_token: session.provider_refresh_token,
          };

          // Desem o actualitzem les credencials a la nostra taula personalitzada.
          const { error: upsertError } = await supabase
            .from('user_credentials')
            .upsert(credentialData, { onConflict: 'user_id, provider' });
            
          if (upsertError) {
            console.error("Error en desar la credencial a user_credentials:", upsertError);
            return NextResponse.redirect(`${origin}/settings/integrations?error=credential_save_failed`);
          }
        }
      } 
      // Si la cookie 'oauth_provider' no existeix, entenem que és un flux de LOGIN/SIGNUP normal
      // des de la pàgina de login, i no cal fer cap acció addicional, només redirigir.

      // Redirigim l'usuari al seu destí final.
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Error en intercanviar el codi per una sessió:", exchangeError.message);
  }

  // --- PAS 4: Si passa alguna cosa inesperada (ex: no hi ha codi), redirigim a login ---
  return NextResponse.redirect(`${origin}/login?error=unknown_auth_error`);
}

