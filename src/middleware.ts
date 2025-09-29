import { createServerClient} from '@supabase/ssr';
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
                getAll() { return request.cookies.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                },
            },
        }
    );
    const { data: { user } } = await supabase.auth.getUser();

    // ✅ CORRECCIÓ DEFINITIVA:
    // Separem els prefixos de la pàgina principal
    const publicPrefixes = ['/login', '/signup', '/auth', '/accept-invite', '/quote', '/invitation/accept'];
    
    // Una ruta és pública si és EXACTAMENT la pàgina principal ('/') o si comença amb un dels prefixos.
    const isPublicPath = pathname === '/' || publicPrefixes.some(p => pathname.startsWith(p));
    const isAppPath = !isPublicPath;

    // --- REGLA 1: Usuari NO autenticat ---
    if (!user && isAppPath) {
        return NextResponse.redirect(new URL(`/${localePrefix}/login`, request.url));
    }

    // --- REGLA 2: Usuari SÍ ESTÀ AUTENTICAT ---
    if (user && isPublicPath) {
        return NextResponse.redirect(new URL(`/${localePrefix}/dashboard`, request.url));
    }
    
    return response;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};