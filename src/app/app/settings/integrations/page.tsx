import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { IntegrationsClient } from './_components/integrations-client'; // El component interactiu

export default async function IntegrationsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Obtenim l'usuari i comprovem si ja té una connexió amb Google
  const { data: { user } } = await supabase.auth.getUser();
  let isConnected = false;

  if (user) {
    const { data } = await supabase
      .from('user_credentials')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .maybeSingle();
    isConnected = !!data;
  }
  
  // Passem l'estat inicial al component client
  return <IntegrationsClient isInitiallyConnected={isConnected} />; 
}