import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MarketingClient } from './_components/marketing-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketing | Ribot',
};

// Define los tipos de datos
export type Campaign = {
  id: string;
  name: string;
  type: string;
  status: 'Completat' | 'Actiu' | 'Planificat';
  campaign_date: string;
  goal: string;
  target_audience: string;
  content: string;
};

export type Kpis = {
  totalLeads: number;
  conversionRate: number;
};

export default async function MarketingPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Carga los datos de la RPC
  const { data, error } = await supabase.rpc('get_marketing_page_data');

  if (error) {
    console.error("Error fetching marketing data:", error);
  }
  
  const kpis = data?.kpis || { totalLeads: 0, conversionRate: 0 };
  const campaigns = data?.campaigns || [];

  return <MarketingClient initialKpis={kpis} initialCampaigns={campaigns} />;
}