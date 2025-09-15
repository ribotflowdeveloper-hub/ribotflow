/**
 * @file page.tsx (Pipeline)
 * @summary Aquest fitxer defineix la pàgina principal del Pipeline de Vendes.
 * Com a Component de Servidor, la seva funció és carregar totes les dades necessàries
 * des de la base de dades (etapes, oportunitats, contactes), processar-les i agrupar-les,
 * i finalment passar-les al component de client `PipelineClient` per a la seva renderització.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PipelineClient } from './_components/pipeline-client';
import type { Metadata } from 'next';

// 'force-dynamic' assegura que aquesta pàgina sempre es renderitzi de manera dinàmica,
// obtenint les dades més recents a cada visita, en lloc de servir una versió estàtica en memòria cau.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Pipeline | Ribot',
};

// --- Definició de Tipus de Dades ---
// Aquests tipus defineixen l'estructura de les dades que es carregaran des de Supabase.
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
  // Aquesta propietat s'omple gràcies al 'join' que fem a la consulta de Supabase.
  contacts: Contact | null;
};

/**
 * @function PipelinePage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function PipelinePage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Per a una millor eficiència, executem totes les consultes a la base de dades en paral·lel.
  const [stagesRes, opportunitiesRes, contactsRes] = await Promise.all([
    supabase.from('pipeline_stages').select('*').eq('user_id', user.id).order('position', { ascending: true }),
    supabase.from('opportunities').select('*, contacts(id, nom)').eq('user_id', user.id),
    supabase.from('contacts').select('id, nom').eq('user_id', user.id)
  ]);
  
  const stages = (stagesRes.data as Stage[]) || [];
  const opportunities = (opportunitiesRes.data as Opportunity[]) || [];
  const contacts = (contactsRes.data as Contact[]) || [];

  // Pre-processem les dades al servidor. Agrupem les oportunitats per la seva etapa (stage_name).
  // Això simplifica la lògica al component de client, que ja rebrà les dades estructurades.
  const opportunitiesByStage = stages.reduce((acc, stage) => {
    acc[stage.name] = opportunities.filter(op => op.stage_name === stage.name).sort((a,b) => (a.value ?? 0) - (b.value ?? 0)) || [];
    return acc;
  }, {} as Record<string, Opportunity[]>);
  
  // Finalment, renderitzem el component de client, passant-li totes les dades com a propietats inicials.
  return (
    <PipelineClient 
      initialStages={stages}
      initialOpportunitiesByStage={opportunitiesByStage}
      initialContacts={contacts}
    />
  );
}
