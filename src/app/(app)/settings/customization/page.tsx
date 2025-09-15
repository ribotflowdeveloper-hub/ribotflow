/**
 * @file page.tsx (Customization)
 * @summary Aquest fitxer defineix la pàgina de Personalització.
 * Com a Component de Servidor, la seva funció principal és carregar les dades inicials
 * (etapes del pipeline, etiquetes) de manera segura des de Supabase i passar-les al
 * component de client `CustomizationClient` per a la seva renderització.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CustomizationClient } from './_components/CustomizationClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Personalització | Ribot',
};

// Definim els tipus de dades per a les etapes i les etiquetes.
export type Stage = { id: string; name: string; };
export type Tag = { id: string; name: string; color: string; };

/**
 * @function CustomizationPage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function CustomizationPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Carreguem les dades inicials en paral·lel per a una millor eficiència.
  const [stagesRes, tagsRes] = await Promise.all([
    supabase.from('pipeline_stages').select('id, name').order('position'),
    supabase.from('tags').select('id, name, color') // Assumint que ja existeix una taula 'tags'.
  ]);

  const stages = stagesRes.data || [];
  const tags = tagsRes.data || [];

  // Passem les dades carregades al component de client.
  return <CustomizationClient initialStages={stages} initialTags={tags} />;
}
