import { createServerClient} from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createStandardClient } from "@supabase/supabase-js";

export const createClient = () => {
    const cookieStore = cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // ✅ NOVA IMPLEMENTACIÓ AMB getAll i setAll
                async getAll() {
                    return (await cookieStore).getAll()
                },
                async setAll(cookiesToSet) {
                    try {
                        // Utilitzem un bucle 'for...of' per a gestionar correctament les promeses
                        // si en el futur 'set' fos asíncron.
                        for (const { name, value, options } of cookiesToSet) {
                            (await cookieStore).set(name, value, options)
                        }
                    } catch (error) {
                        // ✅ Ara passem l'objecte 'error' al console.error
                        console.error("Hi ha hagut un error:", error);
                        // Opcionalment, pots mostrar un missatge més específic a l'usuari
                        // toast.error("Error", { description: error.message });
                    }
                },
            },
        }
    )
}

// La funció per a crear el client d'administrador no canvia.
export const createAdminClient = () => {
    return createStandardClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
};