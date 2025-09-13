import { createClient } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

// ✅ LA LÍNIA CLAU: Forcem el middleware a executar-se a l'entorn Node.js
export const runtime = 'nodejs';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, response } = createClient(request);
  const { data: { session } } = await supabase.auth.getSession();

  const publicRoutes = ['/login', '/redirecting'];
  const isOnboardingPage = pathname === '/onboarding';

  // Si no hi ha sessió, només pot accedir a rutes públiques
  if (!session) {
    if (publicRoutes.includes(pathname) || pathname.startsWith('/auth')) {
      return NextResponse.next();
    }
    return NextResponse.rewrite(new URL('/login', request.url));
  }

  // Si hi ha sessió, comprovem l'estat d'onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', session.user.id)
    .single();

  const onboardingCompleted = profile?.onboarding_completed || false;

  if (!onboardingCompleted && !isOnboardingPage) {
    return NextResponse.rewrite(new URL('/onboarding', request.url));
  }
  
  if (onboardingCompleted && (isOnboardingPage || pathname === '/login')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
