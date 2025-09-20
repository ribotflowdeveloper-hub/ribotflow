// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
// ✅ PAS 1: Importem la llibreria base de Supabase, que és la que té els poders d'administrador.
import { createClient as createStandardClient } from "@supabase/supabase-js";

/**
 * Crea un client de Supabase estàndard per al servidor (per actuar com l'usuari).
 */
export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name: string) => (await cookieStore).get(name)?.value,
        set: async (name: string, value: string, options: CookieOptions) => {
          try { (await cookieStore).set({ name, value, ...options }) } catch { /* Ignorat */ }
        },
        remove: async (name: string, options: CookieOptions) => {
          try { (await cookieStore).set({ name, value: '', ...options }) } catch { /* Ignorat */ }
        },
      },
    }
  )
}

/**
 * ✅ CORREGIT I DEFINITIU: Crea un client de Supabase ADMINISTRATIU real per al servidor.
 * Aquest client utilitza la 'SERVICE_ROLE_KEY' i té accés a TOTES les funcions d'administració.
 */
export const createAdminClient = () => {
  // ✅ PAS 2: Utilitzem 'createStandardClient' de '@supabase/supabase-js'. Aquesta és la forma correcta
  // segons la documentació oficial per a operacions de backend privilegiades.
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

