import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PipelineClient } from './_components/pipeline-client'; // El component interactiu
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pipeline | Ribot',
};

// Definim els tipus de dades que venen de la base de dades
export type Contact = { id: string; nom: string; };
export type Stage = { id: string; name: string; position: number; };
export type Opportunity = {
  id: string;
  name: string;
  stage_name: string;
  value: number | null;
  close_date: string | null;
  description: string | null;
  contact_id: string;
  contacts: Contact | null; // Supabase retorna un objecte, no un array
};

export default async function PipelinePage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Obtenim totes les dades en paral·lel
  const [stagesRes, opportunitiesRes, contactsRes] = await Promise.all([
    supabase.from('pipeline_stages').select('*').order('position', { ascending: true }),
    supabase.from('opportunities').select('*, contacts(id, nom)'),
    supabase.from('contacts').select('id, nom')
  ]);
  
  // Gestionem possibles errors
  if (stagesRes.error || opportunitiesRes.error || contactsRes.error) {
    console.error("Error fetching pipeline data:", stagesRes.error || opportunitiesRes.error || contactsRes.error);
  }

  const stages = stagesRes.data || [];
  const opportunities = opportunitiesRes.data || [];
  const contacts = contactsRes.data || [];

  // Agrupem les oportunitats per etapa aquí, al servidor
  const opportunitiesByStage = stages.reduce((acc, stage) => {
    acc[stage.name] = opportunities.filter(op => op.stage_name === stage.name) || [];
    return acc;
  }, {} as Record<string, Opportunity[]>);
  
  return (
    <PipelineClient 
      initialStages={stages}
      initialOpportunitiesByStage={opportunitiesByStage}
      initialContacts={contacts}
    />
  );
}