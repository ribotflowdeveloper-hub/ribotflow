// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

// Definim les rutes públiques i les que no necessiten processament
const publicPaths = ['/login', '/auth', '/quote']; // '/quote' per a vistes públiques de pressupostos
const ignoredPaths = ['/api', '/_next/static', '/_next/image', '/favicon.ico'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Pas 0: Ignorem les rutes que no necessiten cap lògica
    if (ignoredPaths.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }
    
    // --- PAS 1: Gestió de l'autenticació (Supabase) ---
    const response = NextResponse.next();
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

    // ✅ CORRECCIÓ CLAU: La comprovació ara és molt més estricta
    // Comprovem si el pathname és EXACTAMENT un dels camins públics,
    // o si comença per un camí públic seguit d'una barra (per a rutes dinàmiques com /quote/xyz).
    const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));

    // Si l'usuari no està autenticat i intenta accedir a una ruta protegida
    if (!user && !isPublicPath) {
        const loginUrl = new URL(`/${defaultLocale}/login`, request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Si l'usuari està autenticat...
    if (user) {
        // ...i intenta accedir a una ruta pública com /login, el redirigim al dashboard
        if (pathname === '/login' || pathname === '/onboarding') { // Comprovació més específica
            const dashboardUrl = new URL(`/${defaultLocale}/dashboard`, request.url);
            return NextResponse.redirect(dashboardUrl);
        }

        // ...comprovem l'estat de l'onboarding (aquesta lògica es manté igual)
        const { data: profile } = await supabase.from('profiles').select('onboarding_completed').eq('id', user.id).single();
        const onboardingCompleted = profile?.onboarding_completed || false;
        const isOnboardingPath = pathname.includes('/onboarding');
        
        if (!onboardingCompleted && !isOnboardingPath) {
            const onboardingUrl = new URL(`/${defaultLocale}/onboarding`, request.url);
            return NextResponse.redirect(onboardingUrl);
        }
    }

    // --- PAS 2: Gestió de la internacionalització (i18n) ---
    const handleI18nRouting = createIntlMiddleware({ locales, defaultLocale });
    const i18nResponse = handleI18nRouting(request);
    
    // Copiem les cookies de la resposta de Supabase a la resposta de i18n
    response.cookies.getAll().forEach((cookie) => {
        i18nResponse.cookies.set(cookie);
    });

    return i18nResponse;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};