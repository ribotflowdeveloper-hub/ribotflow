/**
 * @file src/middleware.ts
 * @summary Middleware que gestiona la internacionalització (i18n) i la seguretat.
 */
import { createClient } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  // --- PAS 1: GESTIÓ DE LA INTERNACIONALITZACIÓ (i18n) ---
  // El middleware de next-intl s'encarrega de detectar l'idioma i
  // reescriure la URL amb el prefix de l'idioma correcte (/ca, /es, /en).
  const handleI18nRouting = createIntlMiddleware({
    locales,
    defaultLocale
  });
  const response = handleI18nRouting(request);

  // --- PAS 2: GESTIÓ DE L'AUTENTICACIÓ (SUPABASE) ---
  // Un cop la ruta ja té l'idioma correcte, apliquem la nostra lògica de seguretat.
  
  // La llibreria 'next-intl' elimina el prefix de l'idioma de 'pathname'
  // perquè la nostra lògica no s'hagi de preocupar per ell.
  // Per tant, podem comprovar '/login' directament en lloc de '/ca/login'.
  const { pathname } = request.nextUrl;
  const { supabase } = createClient(request);

  const { data: { user } } = await supabase.auth.getUser();

  // Rutes públiques que no requereixen autenticació
  // Afegim la ruta de pressupostos públics que m'has mostrat.
  const publicPaths = ['/login', '/quote'];

  // Si l'usuari no està autenticat i intenta accedir a una ruta protegida
  if (!user && !publicPaths.some(p => pathname.startsWith(p))) {
    // Redirigim a la pàgina de login, conservant l'idioma actual.
    const loginUrl = new URL(`/${defaultLocale}/login`, request.url);
    // Podríem afegir un 'redirectedFrom' per tornar l'usuari on era.
    // loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si l'usuari està autenticat...
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    const onboardingCompleted = profile?.onboarding_completed || false;
    const allowedPathsForNewUser = ['/onboarding', '/redirecting', '/settings'];

    if (!onboardingCompleted && !allowedPathsForNewUser.some(p => pathname.startsWith(p))) {
      const onboardingUrl = new URL(`/${defaultLocale}/onboarding`, request.url);
      return NextResponse.redirect(onboardingUrl);
    } 
    else if (onboardingCompleted && (pathname === '/login' || pathname === '/onboarding' || pathname === '/')) {
      const dashboardUrl = new URL(`/${defaultLocale}/dashboard`, request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Si no es compleix cap condició, deixem passar la petició processada per i18n.
  return response;
}

export const config = {
  // Apliquem el middleware a totes les rutes excepte les de fitxers estàtics.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|auth).*)'],
};