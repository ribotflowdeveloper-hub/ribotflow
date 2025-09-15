/**
 * @file page.tsx (Integrations)
 * @summary Aquest fitxer defineix la pàgina d'Integracions.
 * Com a Component de Servidor, la seva funció principal és comprovar l'estat actual
 * de les connexions de l'usuari (si té un compte de Google o Microsoft vinculat)
 * i passar aquesta informació al component de client `IntegrationsClient`.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { IntegrationsClient } from './_components/IntegrationsClient';
import { redirect } from 'next/navigation';

export default async function IntegrationsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Comprovem en paral·lel si existeix un registre de credencials per a cada proveïdor.
  // 'maybeSingle()' és útil perquè no retorna un error si no troba cap fila, simplement retorna 'null'.
  const [googleStatus, microsoftStatus] = await Promise.all([
    supabase.from('user_credentials').select('id').eq('user_id', user.id).eq('provider', 'google').maybeSingle(),
    supabase.from('user_credentials').select('id').eq('user_id', user.id).eq('provider', 'azure').maybeSingle()
  ]);
  
  // Creem un objecte simple amb l'estat de les connexions (true/false).
  const connectionStatuses = {
    google: !!googleStatus.data, // La doble negació converteix l'objecte (o null) en un booleà.
    microsoft: !!microsoftStatus.data,
  };
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Integracions</h1>
      {/* Passem l'estat inicial de les connexions al component de client. */}
      <IntegrationsClient initialConnectionStatuses={connectionStatuses} />
    </div>
  ); 
}
