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

    // ✅ AFEGEIX LA TEVA NOVA RUTA A LA LLISTA
    const publicPaths = [
        '/',
        '/login',
        '/signup',
        '/auth',
        '/accept-invite',
        '/quote',
        '/onboarding', // <--- AFEGEIX AQUESTA LÍNIA

        '/invitation/accept' // <--- AFEGEIX AQUESTA LÍNIA
    ];
    const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

    // CAS 1: Usuari NO està autenticat
    if (!user) {
        // Si intenta accedir a una pàgina protegida, el redirigim al login.
        if (!isPublicPath) {
            return NextResponse.redirect(new URL(`/${localePrefix}/login`, request.url));
        }
        // Si està en una pàgina pública, el deixem passar.
        return response;
    }

    // CAS 2: Usuari SÍ està autenticat
    if (user) {
        // Si un usuari ja connectat intenta anar a la pàgina d'inici, login o signup,
        // el redirigim directament al seu dashboard.
        if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
            return NextResponse.redirect(new URL(`/${localePrefix}/dashboard`, request.url));
        }
    }

    // Per a la resta de casos (onboarding, etc.), deixem que la pròpia pàgina
    // o el component de dades gestioni la lògica, evitant així bucles.
    return response;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};