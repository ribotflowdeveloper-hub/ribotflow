import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { IntegrationsClient } from './_components/IntegrationsClient';
import { redirect } from 'next/navigation';

export default async function IntegrationsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Comprovació segura de l'usuari per evitar errors
  const { data: authData, error } = await supabase.auth.getUser();
  if (error || !authData?.user) {
    redirect('/login');
  }
  const user = authData.user;

  // Comprovem al servidor si l'usuari ja té una credencial de Google
  const { data } = await supabase
    .from('user_credentials')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle();
    
  const isConnected = !!data;
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Integracions</h1>
      <IntegrationsClient isInitiallyConnected={isConnected} />
    </div>
  ); 
}

