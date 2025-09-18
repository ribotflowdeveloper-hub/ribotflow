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


  // Si la ruta és la landing page PÚBLICA (/) i no hi ha usuari, el deixem passar
  if (!user && isRootPath) {
    return response;
  }
  
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL(`/${localePrefix}/login`, request.url));
  }
  
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single();
    const onboardingCompleted = profile?.onboarding_completed || false;
    
    const allowedPathsForNewUser = ['/onboarding', '/settings'];
    const isTryingToOnboard = allowedPathsForNewUser.some(p => pathname.startsWith(p));

    if (!onboardingCompleted && !isTryingToOnboard) {
      return NextResponse.redirect(new URL(`/${localePrefix}/onboarding`, request.url));
    }
    
    if (onboardingCompleted && (pathname.startsWith('/login') || pathname.startsWith('/onboarding') || isRootPath)) {
        return NextResponse.redirect(new URL(`/${localePrefix}/dashboard`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};