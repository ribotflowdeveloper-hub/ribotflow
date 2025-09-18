// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export async function middleware(request: NextRequest) {
  // 1. next-intl gestiona l'idioma primer.
  const handleI18nRouting = createIntlMiddleware({ locales, defaultLocale });
  const response = handleI18nRouting(request);

  // Obtenim el pathname SENSE el prefix de l'idioma.
  const pathname = request.nextUrl.pathname.replace(new RegExp(`^/(${locales.join('|')})`), '') || '/';
  const localePrefix = request.nextUrl.pathname.split('/')[1] || defaultLocale;

  // 2. Gestionem l'autenticació.
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

  const publicPaths = ['/login', '/auth', '/quote'];
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p));
  
  // Si l'usuari NO està connectat i la ruta NO és pública, el redirigim al login.
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL(`/${localePrefix}/login`, request.url));
  }
  
  // Si l'usuari ESTÀ connectat...
  if (user) {
    // ...i intenta anar al login, el redirigim al dashboard.
    if (pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL(`/${localePrefix}/dashboard`, request.url));
    }

    // ✅ LÒGICA D'ONBOARDING RESTAURADA
    // Comprovem l'estat de l'onboarding DESPRÉS de les comprovacions bàsiques.
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    const onboardingCompleted = profile?.onboarding_completed || false;
    
    // Rutes permeses per a un usuari que NO ha completat l'onboarding.
    const allowedPathsForNewUser = ['/onboarding', '/settings'];
    const isOnboardingPath = allowedPathsForNewUser.some(p => pathname.startsWith(p));

    // Si NO ha completat l'onboarding i NO està en una ruta permesa, el redirigim.
    if (!onboardingCompleted && !isOnboardingPath) {
      return NextResponse.redirect(new URL(`/${localePrefix}/onboarding`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};