import { type NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// ✅ CORRECCIÓ: Importem l'acció des de la seva nova ubicació centralitzada.
import { resolveInvitationAction } from '@/app/actions/invitationActions';

export const dynamic = 'force-dynamic';

/**
 * Aquest Route Handler és el primer que s'executa quan un usuari
 * fa clic a l'enllaç de la invitació del correu.
 * La seva única feina és actuar com un "director de trànsit".
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  // Obtenim el locale a partir de les capçaleres que injecta el middleware
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
  // Aquesta acció ja retorna una NextResponse.redirect(), per la qual cosa
  // simplement retornem el seu resultat.
  return await resolveInvitationAction(token);
}
