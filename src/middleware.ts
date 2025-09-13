import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// Forcem l'execució a Node.js per a màxima compatibilitat a Vercel.
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, response } = createClient(request);

  // 1. ✅ CORRECCIÓ CLAU: Obtenim l'usuari directament del servidor de Supabase.
  // Això garanteix que sempre tinguem la informació més recent i segura.
  const { data: { user } } = await supabase.auth.getUser();

  // --- CAS 1: L'USUARI NO ESTÀ AUTENTICAT ---
  if (!user) { // Ara comprovem si existeix l'usuari, no la sessió
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // --- CAS 2: L'USUARI ESTÀ AUTENTICAT ---
  
  // Obtenim el seu perfil per comprovar l'estat de l'onboarding.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id) // Utilitzem l'ID de l'usuari autenticat
    .single();


    
  const onboardingCompleted = profile?.onboarding_completed || false;
  
  const allowedPathsForNewUser = ['/onboarding', '/redirecting', '/settings'];

  // Si l'usuari NO HA COMPLETAT l'onboarding...
  if (!onboardingCompleted) {
    if (!allowedPathsForNewUser.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  } 
  // Si l'usuari JA HA COMPLETAT l'onboarding...
  else {
    if (pathname === '/login' || pathname === '/onboarding') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth).*)',
  ],
}