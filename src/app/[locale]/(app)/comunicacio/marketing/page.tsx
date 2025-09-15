/**
 * @file page.tsx (Marketing)
 * @summary Aquest fitxer defineix la pàgina principal del Centre de Màrqueting.
 * Com a Component de Servidor, la seva funció principal és carregar totes les dades
 * necessàries des de la base de dades (KPIs, campanyes) de manera segura al servidor
 * i passar-les al component de client `MarketingClient` per a la seva renderització i interacció.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MarketingClient } from './_components/marketing-client';
import type { Metadata } from 'next';

// Metadades de la pàgina per al SEO i el títol de la pestanya.
export const metadata: Metadata = {
  title: 'Marketing | Ribot',
};

// --- Definició de Tipus de Dades ---
// Aquests tipus asseguren la consistència de les dades entre el servidor, el client i la base de dades.

export type Campaign = {
  id: string;
  name: string;
  type: string;
  status: 'Completat' | 'Actiu' | 'Planificat';
  campaign_date: string; // Utilitzem string per a una fàcil serialització.
  goal: string;
  target_audience: string;
  content: string;
};

export type Kpis = {
  totalLeads: number;
  conversionRate: number;
};

/**
 * @function MarketingPage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function MarketingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Comprovació de seguretat: si l'usuari no està autenticat, el redirigim a la pàgina de login.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // En lloc de fer múltiples consultes a la base de dades, cridem a una única funció de PostgreSQL (RPC).
  // Això és molt més eficient, ja que la lògica de recollida de dades s'executa directament a la base de dades.
  const { data, error } = await supabase.rpc('get_marketing_page_data');

  if (error) {
    console.error("Error en obtenir les dades de màrqueting:", error);
  }
  
  // Gestionem el cas on la funció RPC no retorni dades, proporcionant valors per defecte.
  const kpis = data?.kpis || { totalLeads: 0, conversionRate: 0 };
  const campaigns = data?.campaigns || [];

  // Passem les dades carregades al component de client, que s'encarregarà de tota la interfície interactiva.
  return <MarketingClient initialKpis={kpis} initialCampaigns={campaigns} />;
}
