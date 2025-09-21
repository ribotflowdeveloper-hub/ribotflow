import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CustomizationClient } from './CustomizationClient';

export async function CustomizationData() {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const [stagesRes, tagsRes] = await Promise.all([
    supabase.from('pipeline_stages').select('id, name').order('position'),
    supabase.from('tags').select('id, name, color')
  ]);

  return <CustomizationClient initialStages={stagesRes.data || []} initialTags={tagsRes.data || []} />;
}