// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Crea un client de Supabase estàndard per al servidor.
 * S'autentica com l'usuari que fa la petició, llegint les seves cookies.
 * @param cookieStore Una instància de les cookies obtinguda amb 'cookies()' de 'next/headers'.
 */
export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Ensenyem a Supabase com interactuar amb el magatzem de cookies de Next.js.
      cookies: {
        get: async (name: string) => {
          return (await cookieStore).get(name)?.value
        },
        set: async (name: string, value: string, options: CookieOptions) => {
          try {
            (await cookieStore).set({ name, value, ...options })
          } catch {
            // Ignorat: pot fallar en Server Components, es gestiona via middleware
          }
        },
        remove: async (name: string, options: CookieOptions) => {
          try {
            (await cookieStore).set({ name, value: '', ...options })
          } catch {
            // Ignorat: pot fallar en Server Components, es gestiona via middleware
          }
        },
      },
    }
  )
}


/**
 * Crea un client de Supabase ADMINISTRATIU per al servidor.
 * Aquest client utilitza la 'SERVICE_ROLE_KEY', que té permisos de superusuari
 * i pot saltar-se totes les polítiques de RLS (Row Level Security).
 *
 * ⚠️ ATENCIÓ: Aquest client és molt potent. S'ha d'utilitzar amb molta precaució
 * i NOMÉS en entorns de servidor segurs (com Server Actions o Edge Functions)
 * on es validin els permisos manualment. MAI s'ha d'exposar la SERVICE_ROLE_KEY al client.
 */
export const createAdminClient = () => {
  // No cal ni gestionar cookies perquè fem servir Service Role Key
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      // Aquest client no necessita gestionar cookies d'usuari perquè s'autentica amb la clau mestra.
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
      auth: {
        // Desactivem la gestió de sessions, ja que no és rellevant per a un client d'administració.

        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    }
  );
};
