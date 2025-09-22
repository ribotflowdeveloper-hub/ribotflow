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

    const publicPaths = ['/login', '/signup', '/auth', '/accept-invite'];
    if (!user) {
        if (!publicPaths.some(p => pathname.startsWith(p))) {
            return NextResponse.redirect(new URL(`/${localePrefix}/login`, request.url));
        }
        return response;
    }

    // --- LÒGICA DE REDIRECCIÓ PER A USUARIS AUTENTICATS ---
    const { data: profile } = await supabase.from('profiles').select('onboarding_completed, full_name').eq('id', user.id).single();
    const { data: teamMember } = await supabase.from('team_members').select('team_id').eq('user_id', user.id).maybeSingle();

    const onboardingCompleted = profile?.onboarding_completed || false;
    const profileCompleted = !!profile?.full_name; // Considerem el perfil complet si té nom.
    const hasTeam = !!teamMember;

    // CAS 1: Propietari nou que ha de configurar l'empresa.
    // Condició: No ha completat l'onboarding D'EMPRESA i encara no té equip.
    if (!onboardingCompleted && !hasTeam) {
        if (!pathname.startsWith('/onboarding')) {
            return NextResponse.redirect(new URL(`/${localePrefix}/onboarding`, request.url));
        }
    }
    // CAS 2: Membre convidat que ha de completar el seu perfil.
    // Condició: Ja té un equip però encara no ha omplert el seu nom.
    else if (hasTeam && !profileCompleted) {
        if (!pathname.startsWith('/onboarding-invite')) {
            return NextResponse.redirect(new URL(`/${localePrefix}/onboarding-invite`, request.url));
        }
    }
    // CAS 3: Usuari amb tot configurat.
    else {
        // Si intenta anar a pàgines que ja no li pertoquen, el redirigim al dashboard.
        if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/onboarding') || pathname.startsWith('/onboarding-invite')) {
            return NextResponse.redirect(new URL(`/${localePrefix}/dashboard`, request.url));
        }
    }

    return response;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};