// Aquest arxiu és un "Server Component". El seu codi s'executa NOMÉS al servidor.
// És el lloc ideal per a la càrrega segura de dades i la lògica de negoci.

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ActivitatsClient } from './_components/activitats-client';
import type { Metadata } from 'next';

// L'objecte 'metadata' de Next.js permet definir el títol de la pàgina,
// la descripció i altres etiquetes <head> per a un millor SEO.
export const metadata: Metadata = {
  title: 'Historial d\'Activitats | Ribot',
};

// Definim un tipus de dades estricte per a les activitats.
// Això ens proporciona autocompletat i seguretat de tipus a tot el projecte.
export type Activity = {
  id: string;
  created_at: string;
  type: string;
  content: string;
  is_read: boolean;
  contact_id: string;
  user_id: string;
  // Supabase pot retornar relacions com un objecte o un array d'objectes.
  // En aquest cas, és un objecte (o null si el contacte no existeix).
  contacts: {
    nom: string;
  } | null;
};

export default async function ActivitatsPage() {
  // Obtenim les cookies de la petició entrant per crear un client de Supabase
  // autenticat per a aquesta execució del costat del servidor.
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Comprovem si hi ha una sessió d'usuari activa. Si no, redirigim a la pàgina de login.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Realitzem la consulta a la base de dades per obtenir les activitats.
  const { data: activities, error } = await supabase
    .from('activities')
    // 'select' amb 'contacts(nom)' és una funcionalitat de Supabase per fer un "join"
    // i obtenir el nom del contacte relacionat en una sola consulta.
    .select('*, contacts(nom)')
    .order('created_at', { ascending: false }); // Ordenem de més recent a més antiga.

  if (error) {
    console.error('Error fetching activities:', error);
  }

  // Finalment, renderitzem el 'ActivitatsClient' (que s'executarà al navegador)
  // i li passem les dades carregades aquí al servidor com a 'props'.
  return <ActivitatsClient initialActivities={activities || []} />;
}