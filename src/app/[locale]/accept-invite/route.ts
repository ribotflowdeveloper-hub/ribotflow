import { type NextRequest, NextResponse } from 'next/server';
import { resolveInvitationAction } from '@/app/[locale]/(app)/settings/team/actions'; 
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Aquest Route Handler és el primer que s'executa quan un usuari
 * fa clic a l'enllaç de la invitació del correu.
 * La seva única feina és actuar com un "director de trànsit".
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const locale = (await headers()).get('x-next-intl-locale') || 'ca';

  if (!token) {
    // Si per alguna raó no hi ha token, el portem al login amb un error.
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set('message', 'Token d\'invitació invàlid o inexistent.');
    return NextResponse.redirect(url);
  }

  // Cridem a l'acció que conté la lògica per decidir si l'usuari
  // ha d'anar a la pàgina de login o a la de registre per a convidats.
  return await resolveInvitationAction(token);
}
