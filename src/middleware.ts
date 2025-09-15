/**
 * @file middleware.ts
 * @summary Aquest fitxer defineix el middleware de Next.js per a l'aplicació.
 * El middleware és una funció que s'executa al servidor *abans* que una petició arribi a una pàgina.
 * La seva funció principal aquí és gestionar la seguretat i les redireccions, actuant com un
 * vigilant a la porta d'entrada de les teves rutes.
 */

import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// Forcem l'execució en l'entorn de Node.js per a una màxima compatibilitat, especialment a Vercel.
export const runtime = 'nodejs';

/**
 * @function middleware
 * @summary La funció principal del middleware que s'executa a cada petició que coincideix amb el 'matcher'.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl; // Obtenim la ruta a la qual l'usuari intenta accedir.
  const { supabase, response } = createClient(request); // Inicialitzem un client de Supabase específic per a middleware.

  // Obtenim l'usuari directament des del servidor de Supabase utilitzant el token de la cookie de la petició.
  // Aquest mètode és segur i sempre proporciona l'estat d'autenticació més recent.
  const { data: { user } } = await supabase.auth.getUser();

  // --- CAS 1: L'USUARI NO ESTÀ AUTENTICAT ---
  if (!user) {
    // Si l'usuari no està connectat i no està intentant anar a la pàgina de login,
    // el redirigim forçosament a '/login'.
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Si ja està a '/login', el deixem continuar.
    return NextResponse.next();
  }

  // --- CAS 2: L'USUARI ESTÀ AUTENTICAT ---
  
  // Comprovem el seu perfil per veure si ha completat el procés d'onboarding.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  const onboardingCompleted = profile?.onboarding_completed || false;
  
  // Definim les rutes a les quals un usuari NOU (sense onboarding) té permís per accedir.
  const allowedPathsForNewUser = ['/onboarding', '/redirecting', '/settings'];

  // Si l'usuari NO HA COMPLETAT l'onboarding...
  if (!onboardingCompleted) {
    // ...i intenta accedir a una ruta que NO està a la llista de permeses...
    if (!allowedPathsForNewUser.some(p => pathname.startsWith(p))) {
      // ...el redirigim forçosament a '/onboarding'.
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  } 
  // Si l'usuari JA HA COMPLETAT l'onboarding...
  else {
    // ...i intenta accedir a les pàgines de login, onboarding o a l'arrel...
    if (pathname === '/login' || pathname === '/onboarding' || pathname === '/') {
      // ...el redirigim al seu dashboard, que és la seva pàgina d'inici.
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Si cap de les condicions de redirecció es compleix, deixem que la petició continuï el seu curs normal.
  return response;
}

// L'objecte 'config' defineix a quines rutes s'ha d'aplicar aquest middleware.
export const config = {
  matcher: [
    // Aquesta expressió regular aplica el middleware a TOTES les rutes, excepte a les que són
    // fitxers estàtics, imatges, el favicon o les rutes internes d'autenticació de Next.js.
    '/((?!_next/static|_next/image|favicon.ico|auth).*)',
  ],
}
