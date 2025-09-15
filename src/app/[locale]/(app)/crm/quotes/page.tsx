/**
 * @file page.tsx (Llista de Pressupostos)
 * @summary Aquest fitxer defineix la pàgina principal del mòdul de Pressupostos.
 * Com a Component de Servidor, la seva funció principal és carregar la llista
 * de pressupostos de l'usuari des de Supabase de manera segura i passar-la al
 * component de client `QuotesClient`, que s'encarregarà de la renderització i la interactivitat.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { QuotesClient } from './_components/QuotesClient';
import type { Metadata } from 'next';

// Metadades estàtiques per al SEO i el títol de la pestanya.
export const metadata: Metadata = {
  title: 'Pressupostos | Ribot',
};

// Definim un tipus de dades personalitzat per als pressupostos, incloent la informació del contacte associat.
// Això proporciona seguretat de tipus i fa el codi més llegible.
export type QuoteWithContact = {
  id: string;
  quote_number: string;
  issue_date: string;
  total: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  // Aquesta propietat s'omple gràcies al "join" que fem a la consulta de Supabase.
  contacts: {
    nom: string;
    empresa: string | null;
  } | null;
  created_at: string;
};

/**
 * @function QuotesPage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function QuotesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Carreguem les dades inicials al servidor.
  // La consulta fa un "join" amb la taula 'contacts' per obtenir el nom i l'empresa del contacte
  // directament, la qual cosa és molt més eficient que fer consultes separades.
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*, contacts(nom, empresa)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error en carregar els pressupostos:", error);
    // En un entorn de producció, aquí es podria mostrar una pàgina d'error més amigable.
  }

  return (
    <div>
      {/* Capçalera de la pàgina amb el títol i el botó per crear un nou pressupost. */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pressupostos</h1>
        {/* Utilitzem el component <Link> de Next.js per a una navegació ràpida del costat del client. */}
        <Link href="/crm/quotes/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          <Plus className="w-4 h-4 mr-2" />
          Nou Pressupost
        </Link>
      </div>
      
      {/* Passem les dades carregades al component de client. Aquest s'encarregarà de renderitzar la taula,
          gestionar la cerca, els filtres i les accions com eliminar. */}
      <QuotesClient initialQuotes={quotes || []} />
    </div>
  );
}
