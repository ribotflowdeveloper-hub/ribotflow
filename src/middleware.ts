import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// ✅ CORRECCIÓ 1: Forcem el middleware a executar-se a l'entorn Node.js complet.
// Això garanteix la màxima compatibilitat amb Supabase i un comportament idèntic a l'entorn local.
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, response } = createClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  const isPublicRoute = ['/login', '/redirecting'].includes(pathname);
  const isOnboardingPage = pathname === '/onboarding';

  // --- Lògica per a Usuaris NO Autenticats ---
  if (!session) {
    // Si no hi ha sessió, només permetem l'accés a les rutes públiques.
    // Per a qualsevol altra ruta, inclosa la pàgina d'inici ('/'), redirigim a /login.
    if (isPublicRoute) {
      return NextResponse.next();
    }
    return NextResponse.rewrite(new URL('/login', request.url));
  }

  // --- Lògica per a Usuaris Autenticats ---
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', session.user.id)
    .single();

  const onboardingCompleted = profile?.onboarding_completed || false;

  // 1. Si NO ha completat l'onboarding i NO està a la pàgina d'onboarding, el forcem a anar-hi.
  if (!onboardingCompleted && !isOnboardingPage) {
    return NextResponse.rewrite(new URL('/onboarding', request.url));
  }
  
  // 2. Si JA ha completat l'onboarding...
  if (onboardingCompleted) {
    // ...i intenta anar a /login, /onboarding o a la pàgina d'inici, el portem sempre al dashboard.
    if (isOnboardingPage || pathname === '/login' || pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  // ✅ CORRECCIÓ 2: Excloem les rutes d'autenticació del middleware.
  // Això evita que interfereixi amb el callback de Google/Microsoft.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth).*)',
  ],
}

