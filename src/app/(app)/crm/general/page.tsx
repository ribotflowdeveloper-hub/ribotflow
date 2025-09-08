import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CrmClient } from './_components/crm-client'; // El component interactiu
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CRM General | Ribot',
};

// Definim els tipus de dades que esperem de la nostra funció RPC
// Això ens donarà autocompletat i seguretat de tipus
export type CrmData = {
  stats: {
    totalContacts: number;
    newContactsThisMonth: number;
    opportunities: number;
    pipelineValue: number;
  };
  funnel: {
    leads: number;
    quoted: number;
    clients: number;
  };
  topClients: {
    id: string;
    nom: string;
    total_invoiced: number;
  }[];
  coldContacts: {
    id: string;
    nom: string;
    last_interaction_at: string;
  }[];
  bestMonths: {
    month: string;
    total: number;
  }[];
  unreadActivities: {
    id: string;
    type: string;
    content: string;
    contact_name: string;
    contact_id: string;
    contact_email: string;
    created_at: string;
  }[];
};

export default async function CrmGeneralPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Cridem la funció RPC per obtenir totes les dades del panell del CRM
  const { data, error } = await supabase.rpc('get_crm_dashboard_data');

  if (error) {
    console.error('Error fetching CRM dashboard data:', error);
    // Podríem mostrar un missatge d'error aquí
  }

  // Passem les dades obtingudes al component de client
  return <CrmClient initialData={data} />;
}