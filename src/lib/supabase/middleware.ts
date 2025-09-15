// Aquest arxiu crea un client de Supabase específic per a ser utilitzat
// dins del middleware de Next.js (l'arxiu 'src/middleware.ts').


export const runtime = 'nodejs';

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
/**
 * Crea un client de Supabase per al context d'un Middleware.
 * El middleware s'executa al servidor abans de qualsevol renderitzat, la qual cosa
 * requereix una gestió especial de les cookies.
 * @param request La petició entrant al middleware.
 */
export const createClient = (request: NextRequest) => {
  // Crea una resposta inicial. Aquesta resposta es podrà modificar
  // per les funcions de Supabase si necessiten actualitzar una cookie.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Aquest objecte 'cookies' ensenya a Supabase com llegir i escriure
      // cookies en el context específic del middleware.
      cookies: {
        // Funció per obtenir una cookie.
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        // Funció per establir una cookie.
        set(name: string, value: string, options: CookieOptions) {
          // Si Supabase necessita actualitzar la sessió, modifica la 'response'.
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        // Funció per eliminar una cookie.
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Retornem tant el client de Supabase com la 'response' (que pot haver estat modificada).
  // El middleware haurà de retornar aquesta 'response' per continuar la cadena.
  return { supabase, response };
}