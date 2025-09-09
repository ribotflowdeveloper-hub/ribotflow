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

  // Comprovem l'estat de les dues connexions en paral·lel
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
      <h1 className="text-3xl font-bold mb-8">Integracions</h1>
      <IntegrationsClient initialConnectionStatuses={connectionStatuses} />
    </div>
  ); 
}