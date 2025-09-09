export const runtime = 'nodejs';
import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Aquesta funció ara ens retorna el client i la resposta correcta.
  const { supabase, response } = createClient(request)

  // Aquesta línia és clau: refresca la sessió i s'assegura que la cookie
  // (el "passaport") estigui actualitzada a la 'response'.
  await supabase.auth.getSession()

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  const protectedRoutes = ['/dashboard', '/settings', '/crm'] // Les teves rutes protegides

  // Si l'usuari està logat i intenta anar a /login, el portem al dashboard
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Si l'usuari NO està logat i intenta anar a una ruta protegida, el portem al login
  if (!session && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Si algú va a la pàgina principal "/", redirigeix-lo
  if (pathname === '/') {
    return session 
      ? NextResponse.redirect(new URL('/dashboard', request.url))
      : NextResponse.redirect(new URL('/login', request.url));
  }

  // Retornem la 'response' que pot contenir la cookie actualitzada.
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth).*)',
  ],
}