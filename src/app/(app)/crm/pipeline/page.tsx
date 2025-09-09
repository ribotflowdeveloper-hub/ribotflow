// Ruta del fitxer: src/app/(app)/crm/pipeline/page.tsx
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PipelineClient } from './_components/pipeline-client';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

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
  contacts: Contact | null;
};

export default async function PipelinePage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Obtenim totes les dades en paral·lel
  const [stagesRes, opportunitiesRes, contactsRes] = await Promise.all([
    supabase.from('pipeline_stages').select('*').eq('user_id', user.id).order('position', { ascending: true }),
    supabase.from('opportunities').select('*, contacts(id, nom)').eq('user_id', user.id),
    supabase.from('contacts').select('id, nom').eq('user_id', user.id)
  ]);
  
  const stages = (stagesRes.data as Stage[]) || [];
  const opportunities = (opportunitiesRes.data as Opportunity[]) || [];
  const contacts = (contactsRes.data as Contact[]) || [];

  // Agrupem les oportunitats per etapa aquí, al servidor
  const opportunitiesByStage = stages.reduce((acc, stage) => {
    acc[stage.name] = opportunities.filter(op => op.stage_name === stage.name).sort((a,b) => (a.value ?? 0) - (b.value ?? 0)) || [];
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
