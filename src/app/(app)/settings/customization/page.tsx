import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CustomizationClient } from './_components/CustomizationClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Personalització | Ribot',
};

// Definim els tipus per a les dades
export type Stage = { id: string; name: string; };
export type Tag = { id: string; name: string; color: string; };

export default async function CustomizationPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Obtenim les dades inicials des del servidor
  const [stagesRes, tagsRes] = await Promise.all([
    supabase.from('pipeline_stages').select('id, name').order('position'),
    supabase.from('tags').select('id, name, color') // Assumint que tens una taula 'tags'
  ]);

  const stages = stagesRes.data || [];
  const tags = tagsRes.data || [];

  return <CustomizationClient initialStages={stages} initialTags={tags} />;
}