import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./i18n";

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const isProduction = process.env.NODE_ENV === "production";
type AppLocale = typeof locales[number];

// -----------------------------------------------------------------
// 🔑 AQUESTA ÉS LA CORRECCIÓ CLAU QUE VAM TROBAR AL FÒRUM
// Forcem el middleware a executar-se en l'entorn Node.js
// per evitar el conflicte de runtimes (Node vs Deno/Edge).
export const runtime = "nodejs";
// -----------------------------------------------------------------

export async function middleware(request: NextRequest) {
    const allCookies = request.cookies.getAll();
    const localeCookie = allCookies.find((c) => c.name === LOCALE_COOKIE_NAME);
    const storedLocale = localeCookie?.value;

    // 🔑 CLAU FIX 1 (TypeScript): Determinem el locale per a la redirecció d'Auth.
    // Utilitzem la cookie si és un idioma suportat, altrament el default.
    const authRedirectLocale: AppLocale =
        (storedLocale && locales.includes(storedLocale as AppLocale))
            ? (storedLocale as AppLocale)
            : defaultLocale;

    // 1. Next-intl processa la petició
    const handleI18nRouting = createIntlMiddleware({
        locales,
        defaultLocale,
        localeDetection: true, // Mantenim la detecció de la cookie
        localePrefix: "always",
        localeCookie: {
            name: LOCALE_COOKIE_NAME,
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
            sameSite: "lax",
            secure: isProduction,
        },
    });

    const response = handleI18nRouting(request);

    // ----------------------------------------------------------------
    // 🔑 CLAU FIX 2: ATURAR EL BUCLE. Si next-intl ja ha decidit redirigir (canviant l'idioma),
    // hem d'aturar la nostra lògica d'Auth i deixar que next-intl executi la seva redirecció.
    // ----------------------------------------------------------------
    if (response.headers.get("Location")) {
        // En aquest punt, next-intl ha determinat que l'usuari ha de ser redirigit a un altre URL
        // (p. ex., de / a /ca o de /es a /ca, o viceversa). Deixem que la redirecció es produeixi.
        return response;
    }
    // ----------------------------------------------------------------

    // 2. Extreure dades i executar la lògica de Supabase
    const pathnameWithoutLocale = request.nextUrl.pathname.replace(
        new RegExp(`^/(${locales.join("|")})`),
        "",
    ) || "/";

    // Cridem Supabase per obtenir l'usuari (necessari per a la redirecció d'Auth)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        },
    );
    const { data: { user } } = await supabase.auth.getUser();

    // Rutes que són PÚBLIQUES (accessibles sense auth)
    const publicPrefixes = [
        "/login",
        "/signup",
        "/auth",
        "/accept-invite",
        "/quote",
        "/invitation/accept",
        "/politica-privacitat",
        "/termes-condicions",
        "/politica-cookies",
    ];
    // Rutes COMPARTIDES: Són públiques, però si estic loguejat vull veure-les igualment (no vull anar al dashboard)
    const sharedPrefixes = [
        "/quote",
        "/invitation/accept",
        "/accept-invite",
    ];
    const isPublicPath = pathnameWithoutLocale === "/" ||
        publicPrefixes.some((p) => pathnameWithoutLocale.startsWith(p));
    const isSharedPath = sharedPrefixes.some((p) =>
        pathnameWithoutLocale.startsWith(p)
    );
    const isAppPath = !isPublicPath;

    // --- REGLA 1: Usuari NO autenticat ---
    if (!user && isAppPath) {
        // Redirigim a /<locale_cookie>/login
        return NextResponse.redirect(
            new URL(`/${authRedirectLocale}/login`, request.url),
        );
    }

    // --- REGLA 2: Usuari SÍ ESTÀ AUTENTICAT ---
    if (user && isPublicPath && !isSharedPath) { // Redirigim de la ruta pública (com / o /login) a /<locale_cookie>/dashboard
        return NextResponse.redirect(
            new URL(`/${authRedirectLocale}/dashboard`, request.url),
        );
    }

    // Si no hi ha cap redirecció d'Auth, retornem la resposta de next-intl (que farà el rewrite).
    return response;
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
