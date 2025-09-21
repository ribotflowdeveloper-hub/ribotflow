import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ActivitatsClient } from './activitats-client';

// Aquest és un Server Component asíncron que fa la feina pesada.
export async function ActivitiesData() {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: activities, error } = await supabase
    .from('activities')
    .select('*, contacts(nom)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching activities:", error.message);
    return <ActivitatsClient initialActivities={[]} />;
  }

  return <ActivitatsClient initialActivities={activities || []} />;
}