import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Aquesta és l'única funció que necessites per crear un client de Supabase
 * a qualsevol lloc del servidor (Server Components, Route Handlers, Server Actions).
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return (await cookieStore).get(name)?.value
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value, ...options })
          } catch (error) {
            // Aquest error pot passar si s'intenta escriure una cookie des d'un Server Component.
            // Es pot ignorar si tens un middleware que refresca les sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value: '', ...options })
          } catch (error) {
            // El mateix que a dalt.
          }
        },
      },
    }
  )
}