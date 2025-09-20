import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export async function middleware(request: NextRequest) {
  // 1. GESTIÓ D'IDIOMA PRIMER
  const handleI18nRouting = createIntlMiddleware({ locales, defaultLocale });
  const response = handleI18nRouting(request);

  // Obtenim el pathname net (sense /ca, /es, etc.) per a les comprovacions
  const pathname = request.nextUrl.pathname.replace(new RegExp(`^/(${locales.join('|')})`), '') || '/';
  const localePrefix = request.nextUrl.pathname.split('/')[1] || defaultLocale;

  // 2. GESTIÓ DE LA SESSIÓ AMB SUPABASE
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { response.cookies.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { response.cookies.set({ name, value: '', ...options }); },
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();

  const publicPaths = ['/login', '/auth', '/quote', '/signup']; // L'arrel (/) és la landing page, ja gestionada
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p));
  const isRootPath = pathname === '/';


 // CAS 1: Usuari NO connectat
 if (!user) {
  // Si la ruta NO és pública i NO és la pàgina d'inici, el redirigim al login
  if (!isPublicPath && !isRootPath) {
    return NextResponse.redirect(new URL(`/${localePrefix}/login`, request.url));
  }
  return response;
}

// CAS 2: Usuari SÍ connectat
if (user) {
  const { data: profile } = await supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single();
  const onboardingCompleted = profile?.onboarding_completed || false;
  
  const allowedPathsForNewUser = ['/onboarding', '/settings'];
  const isTryingToOnboard = allowedPathsForNewUser.some(p => pathname.startsWith(p));

  // CAS 2.1: L'usuari és NOU (onboarding incomplet)
  if (!onboardingCompleted) {
    // Si no està intentant anar a l'onboarding, el forcem a anar-hi
    if (!isTryingToOnboard) {
      return NextResponse.redirect(new URL(`/${localePrefix}/onboarding`, request.url));
    }
  } 
  // CAS 2.2: L'usuari ja EXISTEIX (onboarding complet)
  else {
    // Si intenta anar a pàgines que ja no li pertoquen, el redirigim al dashboard
    if (pathname.startsWith('/login') || pathname.startsWith('/onboarding') || isRootPath) {
      return NextResponse.redirect(new URL(`/${localePrefix}/dashboard`, request.url));
    }
  }
}

return response;
}

export const config = {
matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};