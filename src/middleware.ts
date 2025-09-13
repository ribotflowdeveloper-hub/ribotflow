import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// ✅ CORRECCIÓ 1: Forcem l'execució a Node.js per a màxima compatibilitat a Vercel.
// Això és CRUCIAL per evitar problemes de memòria cau (caching) i garantir que sempre
// llegim les dades més recents de la base de dades.
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, response } = createClient(request);

  // Obtenim la sessió de l'usuari. Aquesta crida és eficient.
  const { data: { session } } = await supabase.auth.getSession();

  // --- CAS 1: L'USUARI NO ESTÀ AUTENTICAT ---
  if (!session) {
    // Si l'usuari intenta accedir a qualsevol pàgina que no sigui el login,
    // el redirigim a la pàgina de login. Això inclou la pàgina d'inici ('/').
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Si l'usuari ja està a la pàgina de login, el deixem tranquil.
    return NextResponse.next();
  }

  // --- CAS 2: L'USUARI ESTÀ AUTENTICAT ---
  
  // Obtenim el seu perfil per comprovar l'estat de l'onboarding.
  // Aquesta és la consulta més important del middleware. Si falla, és per les polítiques RLS.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', session.user.id)
    .single();

  const onboardingCompleted = profile?.onboarding_completed || false;
  
  const isOnboardingPage = pathname === '/onboarding';
  
  // Si l'usuari JA HA COMPLETAT l'onboarding...
  if (onboardingCompleted) {
    // ...i intenta accedir a pàgines que ja no li pertoquen (onboarding, login),
    // el portem al seu lloc de treball, el dashboard.
    if (isOnboardingPage || pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Si intenta anar a la pàgina d'inici, també el portem al dashboard.
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } 
  // Si l'usuari NO HA COMPLETAT l'onboarding...
  else {
    // ...i no està a la pàgina d'onboarding (intenta escapar), el forcem a anar-hi.
    // Permetem l'accés a '/redirecting' que és una pàgina intermèdia just després de l'onboarding.
    if (!isOnboardingPage && pathname !== '/redirecting') {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  // Si cap de les regles de redirecció anteriors s'ha aplicat,
  // significa que l'usuari té permís per estar on està. Deixem que continuï.
  return response;
}

export const config = {
  // ✅ CORRECCIÓ 2: Aquesta configuració és la clau per a les integracions.
  // Exclou qualsevol ruta que comenci amb 'auth' (com '/auth/callback'),
  // permetent que Supabase completi el flux d'OAuth sense interferències.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth).*)',
  ],
}

