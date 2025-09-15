/**
 * @file page.tsx (Templates)
 * @summary Component de Servidor per a la pàgina de gestió de plantilles d'email.
 * La seva única responsabilitat és carregar la llista inicial de plantilles des de Supabase
 * i passar-la al component de client `TemplatesClient`.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TemplatesClient } from './_components/templates-client';
import type { Metadata } from 'next';

// Metadades de la pàgina.
export const metadata: Metadata = {
  title: 'Plantilles d\'Email | Ribot',
};

// Definim el tipus de dades per a una plantilla d'email.
// És important tenir-lo aquí perquè tant el component de servidor com les accions l'utilitzen.
export type EmailTemplate = {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
};

/**
 * @function TemplatesPage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function TemplatesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Carreguem totes les plantilles de l'usuari actual, ordenades per data de creació.
  const { data: templates, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error en carregar les plantilles:', error);
  }

  // Passem les dades carregades (o un array buit si hi ha un error o no n'hi ha)
  // al component de client.
  return <TemplatesClient initialTemplates={templates || []} />;
}
