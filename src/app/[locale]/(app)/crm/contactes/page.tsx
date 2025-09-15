/**
 * @file page.tsx (Llista de Contactes)
 * @summary Aquest fitxer defineix la pàgina principal del mòdul de Contactes del CRM.
 * Com a Component de Servidor, la seva única responsabilitat és carregar la llista
 * inicial de contactes de l'usuari des de Supabase i passar-la al component de client
 * `ContactsClient`, que s'encarregarà de la visualització (taula) i la interactivitat (cerca, filtres, etc.).
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ContactsClient } from './_components/contacts-client';
import type { Metadata } from 'next';

// Metadades estàtiques per a la pàgina.
export const metadata: Metadata = {
  title: 'Contactes | Ribot',
};

/**
 * @function ContactesPage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function ContactesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Carreguem tots els contactes de l'usuari actual, ordenats per data de creació.
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error en carregar els contactes:', error);
  }

  // Passem la llista de contactes (o un array buit si hi ha hagut un error)
  // al component de client com a propietat inicial.
  return <ContactsClient initialContacts={contacts || []} />;
}
