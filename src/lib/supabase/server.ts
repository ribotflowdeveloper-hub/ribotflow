import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createStandardClient } from "@supabase/supabase-js";

/**
 * Crea un client de Supabase per al servidor que actua en nom de l'usuari.
 * Aquesta és la versió definitiva que accepta 'cookieStore' com a paràmetre.
 */
export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // Utilitzem els mètodes moderns 'getAll' i 'setAll'
                async getAll() {
                    return (await cookieStore).getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(async ({ name, value, options }) =>
                            (await cookieStore).set(name, value, options)
                        );
                    } catch {
                        // Ignorem errors si s'executa en un context on no es poden modificar cookies.
                    }
                },
            },
        }
    );
};

/**
 * Crea un client de Supabase amb permisos d'administrador per al servidor.
 */
export const createAdminClient = () => {
    return createStandardClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
};

