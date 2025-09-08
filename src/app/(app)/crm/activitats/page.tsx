import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ActivitatsClient } from './_components/activitats-client'; // El component interactiu
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Historial d\'Activitats | Ribot',
};

// Definim el tipus de dades per a una activitat
export type Activity = {
  id: string;
  created_at: string;
  type: string;
  content: string;
  is_read: boolean;
  contact_id: string;
  user_id: string;
  contacts: { // Supabase retorna la relació com un objecte
    nom: string;
  } | null;
};

export default async function ActivitatsPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Obtenim les activitats des del servidor
  const { data: activities, error } = await supabase
    .from('activities')
    .select('*, contacts(nom)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching activities:', error);
    // Podem gestionar l'estat d'error aquí si volem
  }

  // Passem les dades al component de client
  return <ActivitatsClient initialActivities={activities || []} />;
}