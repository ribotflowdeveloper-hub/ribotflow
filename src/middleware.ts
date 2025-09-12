// middleware.ts
import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, response } = createClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  const publicRoutes = ['/login'];
  const isOnboardingPage = pathname === '/onboarding';

  // Si no hi ha sessió, només pot accedir a /login
  if (!session) {
    if (publicRoutes.includes(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.rewrite(new URL('/login', request.url));
  }

  // Si hi ha sessió, comprovem l'estat d'onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', session.user.id)
    .single();

  const onboardingCompleted = profile?.onboarding_completed || false;

  if (!onboardingCompleted && !isOnboardingPage) {
    // Si no ha completat l'onboarding i NO està a la pàgina d'onboarding, el redirigim forçosament.
    return NextResponse.rewrite(new URL('/onboarding', request.url));
  }
  
  if (onboardingCompleted && isOnboardingPage) {
    // Si ja ha completat l'onboarding i intenta anar a la pàgina d'onboarding, el portem al dashboard.
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Si hi ha sessió i intenta anar a la home, el portem al dashboard.
  if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth).*)',
  ],
}