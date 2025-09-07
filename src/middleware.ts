import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  // LÒGICA DE REDIRECCIÓ PRINCIPAL
  // Si hi ha sessió i l'usuari va a /login, redirigim al dashboard
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Si NO hi ha sessió i l'usuari intenta accedir a una ruta protegida (com /dashboard), redirigim al login
  if (!session && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // LÒGICA PER A LA PÀGINA D'INICI (/)
  // Si l'usuari va a la pàgina arrel
  if (pathname === '/') {
    if (session) {
      // Si té sessió, al dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      // Si no té sessió, al login
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return response;
}

// Configura quines rutes han de passar pel middleware
export const config = {
  matcher: [
    /*
     * Coincideix amb totes les rutes excepte les de fitxers estàtics,
     * imatges o rutes internes de Next.js.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth).*)',
  ],
};