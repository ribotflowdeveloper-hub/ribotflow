// app/auth/callback/route.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
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

    // 1. Bescanviem el codi i CAPTUREM LA RESPOSTA (aquí està la clau)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error en intercanviar el codi per sessió:", error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
    
    // Si l'intercanvi ha anat bé, 'data.session' conté la nova sessió
    const { session, user } = data;

    // 2. Comprovem si era un flux de VINCULACIÓ (integració)
    const provider = cookieStore.get('oauth_provider')?.value;

    // Aquesta lògica només s'executa si venim de la pàgina d'integracions
    if (provider && session && user) {
      console.log(`Gestionant vinculació per al provider: ${provider}`);
      cookieStore.delete('oauth_provider'); // Netegem la cookie

      // ✅ LA CORRECCIÓ: Utilitzem el 'provider_refresh_token' de la sessió que acabem d'obtenir
      const refreshToken = session.provider_refresh_token;

      if (!refreshToken) {
        console.error("No s'ha trobat el provider_refresh_token després de la vinculació.");
        return NextResponse.redirect(`${origin}/settings/integrations?error=token_not_found`);
      }
      
      await supabase.from('user_credentials').upsert({
        user_id: user.id,
        provider: provider,
        refresh_token: refreshToken,
      }, { onConflict: 'user_id, provider' });
    }
    
    // 3. Tot ha anat bé, redirigim. 
    // El middleware s'encarregarà de la resta (onboarding vs dashboard).
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Si no hi ha 'code' a la URL, és un error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}