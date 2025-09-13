import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const cookieStore = cookies(); // Definim cookieStore a l'inici per poder-la fer servir a tot arreu.

  // --- PAS 1: Gestió d'errors rebuts des del proveïdor OAuth ---
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  if (error || errorCode || errorDescription) {
    console.error(`Error en el callback d'OAuth: ${errorDescription || 'Error desconegut'}`);
    
    if (errorCode === 'identity_already_exists' || errorDescription?.includes('Identity is already linked')) {
      return NextResponse.redirect(`${origin}/settings/integrations?error=identity_exists`);
    }

    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // --- PAS 2: Si no hi ha errors, intercanviem el codi per una sessió ---
  if (code) {
    // NOU PAS CLAU: Llegim el proveïdor des de la cookie que hem guardat a l'action.
    const provider = (await cookieStore).get('oauth_provider')?.value;
    
    // Neteja: Esborrem la cookie immediatament després de llegir-la per seguretat.
    if (provider) {
        (await cookieStore).delete('oauth_provider');
    } else {
        console.error("Error crític: No s'ha trobat la cookie 'oauth_provider' per determinar el proveïdor.");
        return NextResponse.redirect(`${origin}/settings/integrations?error=provider_missing`);
    }

    const supabase = createClient(cookieStore);
    
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      // --- PAS 3: Un cop la sessió és vàlida, desem les credencials ---
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.provider_refresh_token) {
        
        const credentialData = {
          user_id: session.user.id,
          // ✅ CORRECCIÓ DEFINITIVA: Utilitzem el proveïdor guardat a la cookie.
          // Això elimina qualsevol ambigüitat o problema de dades obsoletes.
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
      
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Error en intercanviar el codi per una sessió:", exchangeError.message);
  }

  // --- PAS 4: Si alguna cosa inesperada falla, redirigim a login ---
  return NextResponse.redirect(`${origin}/login?error=unknown_auth_error`);
}

