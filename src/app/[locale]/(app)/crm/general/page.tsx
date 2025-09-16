// Aquest arxiu és un Server Component. S'executa només al servidor per carregar
// les dades de forma segura i eficient abans d'enviar la pàgina al navegador.

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CrmClient } from './_components/crm-client'; // Importem el component de client que renderitzarà la UI.
import type { Metadata } from 'next';

// Exportem 'metadata' per definir el títol de la pàgina i altres etiquetes <head>.
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
    avgRevenuePerClient: number; // ✅ AFEGEIX AQUESTA LÍNIA
    avgConversionTimeDays: number; // ✅ AFEGEIX AQUESTA LÍNIA
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

/**
 * Aquesta és la funció principal de la pàgina del servidor.
 * La seva responsabilitat és:
 * 1. Autenticar l'usuari.
 * 2. Carregar totes les dades necessàries per al panell de control del CRM.
 * 3. Passar aquestes dades al component de client ('CrmClient') perquè les mostri.
 */
export default async function CrmGeneralPage() {
  // Obtenim les cookies per crear un client de Supabase autenticat al servidor.
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verifiquem la sessió de l'usuari. Si no existeix, el redirigim a la pàgina de login.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Cridem la funció de PostgreSQL 'get_crm_dashboard_data' mitjançant RPC (Remote Procedure Call).
  // Aquesta funció, que viu a la base de dades, fa tots els càlculs complexos i ens retorna un únic objecte JSON.
  const { data, error } = await supabase.rpc('get_crm_dashboard_data');

  if (error) {
    console.error('Error fetching CRM dashboard data:', error);
    // En un entorn de producció, aquí podríem retornar una pàgina d'error personalitzada.
  }

  // Renderitzem el component de client i li passem les dades carregades com a propietat ('initialData').
  return <CrmClient initialData={data} />;
}