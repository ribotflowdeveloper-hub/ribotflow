import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { PipelineClient } from '../pipeline-client'; // El teu component de client actual
import type { Stage, Contact } from '../page';

// Aquest és un Server Component asíncron
export async function PipelineData() {
  // Aquesta és la part lenta que abans bloquejava tota la pàgina
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // En un component fill no podem redirigir, podríem retornar un missatge d'error
    return <div>No autoritzat</div>;
  }
 
  const [stagesRes, contactsRes] = await Promise.all([
    supabase.from('pipeline_stages').select('id, name, position').eq('user_id', user.id).order('position', { ascending: true }),
    supabase.from('contacts').select('id, nom').eq('user_id', user.id)
  ]);
  
  const stages = (stagesRes.data as Stage[]) || [];
  const contacts = (contactsRes.data as Contact[]) || [];

  // Un cop tenim les dades, renderitzem el component de client, que ja és ràpid
  return (
    <PipelineClient 
      initialStages={stages}
      initialContacts={contacts}
    />
  );
}