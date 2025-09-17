/**
 * @file MarketingData.tsx
 * @summary Component de Servidor dedicat a carregar les dades de màrqueting.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { MarketingClient } from './marketing-client';
import type { Campaign, Kpis } from '../page';

export async function MarketingData() {
 
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Cridem a la funció RPC per obtenir totes les dades en una sola petició.
  const { data, error } = await supabase.rpc('get_marketing_page_data');

  if (error) {
    console.error("Error en obtenir les dades de màrqueting:", error);
    // En cas d'error, passem valors per defecte per evitar que el component client es trenqui.
    return <MarketingClient initialKpis={{ totalLeads: 0, conversionRate: 0 }} initialCampaigns={[]} />;
  }
  
  const kpis: Kpis = data?.kpis || { totalLeads: 0, conversionRate: 0 };
  const campaigns: Campaign[] = data?.campaigns || [];

  return <MarketingClient initialKpis={kpis} initialCampaigns={campaigns} />;
}