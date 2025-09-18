import { createServerClient} from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * @summary Aquesta ruta gestiona l'intercanvi del codi d'autenticació per una sessió.
 * La seva única responsabilitat és verificar la sessió i redirigir a l'arrel.
 * El middleware s'encarregarà de la resta.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  // Si tenim un codi, l'intercanviem per una sessió
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
      // ✅ ÈXIT: Redirigim a la pàgina principal ('/')
      // El middleware interceptarà aquesta petició i decidirà si l'usuari
      // ha d'anar a /onboarding o a /dashboard.
      return NextResponse.redirect(origin);
    }

    console.error("Error en intercanviar el codi per sessió:", error.message);
  }

  // Si hi ha qualsevol altre problema, enviem a la pàgina de login amb un error.
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}