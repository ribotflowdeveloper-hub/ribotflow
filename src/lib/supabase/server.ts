// src/lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = (cookieStore: ReturnType<typeof cookies>) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ Aquestes funcions han de ser 'async' per poder utilitzar 'await'
        get: async (name: string) => {
          // No podem llegir de 'cookieStore' directament. Primer hem d'esperar la promesa.
          return (await cookieStore).get(name)?.value
        },
        set: async (name: string, value: string, options: CookieOptions) => {
          try {
            // Esperem la promesa abans d'intentar escriure.
            (await cookieStore).set({ name, value, ...options })
          } catch (error) {
            // Aquest error pot passar si s'intenta escriure des d'un Server Component,
            // la qual cosa és normal. El middleware s'encarregarà.
          }
        },
        remove: async (name: string, options: CookieOptions) => {
          try {
            // Esperem la promesa abans d'intentar esborrar.
            (await cookieStore).set({ name, value: '', ...options })
          } catch (error) {
             // El mateix que a 'set'.
          }
        },
      },
    }
  )
}