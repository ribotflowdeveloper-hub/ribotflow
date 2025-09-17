/**
 * @file IntegrationsData.tsx
 * @summary Component de Servidor que carrega l'estat de les connexions de l'usuari.
 */
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { IntegrationsClient } from './IntegrationsClient';
import { getTranslations } from 'next-intl/server';

export async function IntegrationsData() {
  const t = await getTranslations('SettingsPage.integrations');
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null; // El middleware ja s'encarrega de la redirecció

  // Comprovem en paral·lel si existeix un registre de credencials per a cada proveïdor.
  const [googleStatus, microsoftStatus] = await Promise.all([
    supabase.from('user_credentials').select('id').eq('user_id', user.id).eq('provider', 'google').maybeSingle(),
    supabase.from('user_credentials').select('id').eq('user_id', user.id).eq('provider', 'azure').maybeSingle()
  ]);
  
  const connectionStatuses = {
    google: !!googleStatus.data,
    microsoft: !!microsoftStatus.data,
  };
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{t('pageTitle')}</h1>
      <IntegrationsClient initialConnectionStatuses={connectionStatuses} />
    </div>
  );
}