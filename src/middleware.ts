import { createServerClient} from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export async function middleware(request: NextRequest) {
    const handleI18nRouting = createIntlMiddleware({ locales, defaultLocale });
    const response = handleI18nRouting(request);

    const pathname = request.nextUrl.pathname.replace(new RegExp(`^/(${locales.join('|')})`), '') || '/';
    const localePrefix = request.nextUrl.pathname.split('/')[1] || defaultLocale;
    
    // ✅ AQUEST BLOC HA ESTAT ACTUALITZAT
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // La nova funció 'getAll' retorna totes les cookies
                getAll() {
                    return request.cookies.getAll();
                },
                // La nova funció 'setAll' rep un array de cookies per a desar
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                },
            },
        }
    );
    const { data: { user } } = await supabase.auth.getUser();

    const publicPaths = ['/', '/login', '/signup', '/auth', '/accept-invite', '/quote', '/invitation/accept'];
    const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

    if (!user && !isPublicPath) {
        return NextResponse.redirect(new URL(`/${localePrefix}/login`, request.url));
    }

    if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
        return NextResponse.redirect(new URL(`/${localePrefix}/dashboard`, request.url));
    }
    
    return response;
}


export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
};