/**
 * @file src/app/[locale]/(app)/crm/pipeline/loading.tsx
 * @summary Aquest fitxer s'activa automàticament durant la navegació.
 * Reutilitza el component PipelineSkeleton per a una experiència d'usuari consistent.
 */

// 1. Importa el teu component Skeleton des d'on el tinguis guardat
import { PipelineSkeleton } from './_components/PipelineSkeleton';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { Stage } from './page'; // Importa el tipus Stage

// 2. Aquest és el component que Next.js renderitzarà automàticament
export default async function PipelineLoading() {
  // 3. (Opcional, però recomanat) Carreguem les dades mínimes per a l'esquelet,
  // com les etapes, per fer-lo més realista. Aquesta consulta és molt ràpida.
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  const { data: stagesData } = await supabase
    .from('pipeline_stages')
    .select('id, name, position');

  const stages = (stagesData as Stage[]) || [];

  // 4. Retornem el teu component Skeleton amb les dades necessàries.
  return <PipelineSkeleton stages={stages} viewMode="columns" />;
}