// /middleware.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export async function middleware(request: NextRequest) {
    const handleI18nRouting = createIntlMiddleware({ locales, defaultLocale });
    const response = handleI18nRouting(request);

    const pathname = request.nextUrl.pathname.replace(new RegExp(`^/(${locales.join('|')})`), '') || '/';
    const localePrefix = request.nextUrl.pathname.split('/')[1] || defaultLocale;

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

    const publicPaths = ['/', '/login', '/signup', '/auth', '/accept-invite', '/quote', '/onboarding', '/invitation/accept'];
    const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

    // CASO 1: Usuario NO autenticado
    if (!user) {
        if (!isPublicPath) {
            return NextResponse.redirect(new URL(`/${localePrefix}/login`, request.url));
        }
        return response;
    }

     // CAS 2: Usuari SÍ està autenticat
     const { data: profile } = await supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single();
     const hasCompletedOnboarding = profile?.onboarding_completed || false;
     const activeTeamId = user.app_metadata?.active_team_id;
 
     // ✅ AFEGIM UNA EXCEPCIÓ PER A ACCEPTAR INVITACIONS
     // Si l'usuari està intentant acceptar una invitació, el deixem passar SEMPRE.
     if (pathname.startsWith('/accept-invite')) {
         return response;
     }
 
     // 2a. Si no ha completat l'onboarding, se'l força a anar-hi
     if (!hasCompletedOnboarding && !pathname.startsWith('/onboarding')) {
         return NextResponse.redirect(new URL(`/${localePrefix}/onboarding`, request.url));
     }
 
     // 2b. Si ha completat l'onboarding però no té equip actiu, a la selecció d'equip
     if (hasCompletedOnboarding && !activeTeamId && !pathname.startsWith('/settings/team')) {
         return NextResponse.redirect(new URL(`/${localePrefix}/settings/team`, request.url));
     }
 
     // 2c. Si ja està tot configurat, el portem al dashboard si intenta anar a pàgines inicials
     if (hasCompletedOnboarding && activeTeamId) {
         if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/onboarding')) {
             return NextResponse.redirect(new URL(`/${localePrefix}/dashboard`, request.url));
         }
     }
    
    // Si ninguna de las condiciones anteriores se cumple, se le deja pasar
    return response;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};