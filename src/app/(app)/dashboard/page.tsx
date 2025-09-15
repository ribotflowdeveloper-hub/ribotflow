/**
 * @file page.tsx (Dashboard)
 * @summary Aquest fitxer defineix la pàgina principal del Tauler de Control (Dashboard).
 * Com a Component de Servidor, la seva funció principal és carregar totes les dades
 * necessàries de manera segura des de diferents fonts (taules, funcions RPC, Edge Functions),
 * processar-les i passar-les al component de client `DashboardClient` en un format unificat.
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { DashboardClient } from './dashboard-client'

export const metadata: Metadata = {
  title: 'Tauler Principal | Ribot',
}

// Tipus de dades específic per als contactes en aquest context.
export interface Contact {
  id: string;
  nom: string;
  email?: string;
  phone?: string;
  last_interaction_at?: string | null;
}

/**
 * @summary Una funció d'ajuda que s'executa al servidor per calcular canvis percentuals.
 * Mantenir aquesta lògica al servidor és eficient i segur.
 */
const calculatePercentageChange = (current: number, previous: number): string => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) > 999) return change > 0 ? '+999%' : '-999%';
  return `${change >= 0 ? '+' : ''}${change.toFixed(0)}% vs mes anterior`;
};

/**
 * @function DashboardPage
 * @summary El component de servidor asíncron que construeix la pàgina.
 */
export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Per a una màxima eficiència, executem totes les peticions de dades en paral·lel amb Promise.all.
  const [statsRes, tasksRes, overdueInvoicesRes, contactsRes, aiInsightsRes] = await Promise.all([
    supabase.rpc('get_dashboard_stats'), // Crida a una funció de base de dades per a estadístiques complexes.
    supabase.from('tasks').select('*').order('is_completed, created_at'), // Consulta a la taula de tasques.
    supabase.from('invoices').select('id, contacts(nom), due_date').in('status', ['Sent', 'Overdue']).lt('due_date', new Date().toISOString()), // Consulta a la taula de factures.
    supabase.from('contacts').select('*').order('created_at', { ascending: false }), // Consulta a la taula de contactes.
    supabase.functions.invoke('generate-ai-summary'), // Crida a una Edge Function per obtenir informació de la IA.
  ])

  const statsData = statsRes.data?.[0] || {};
  const contactsData = contactsRes.data || [];

  // Les consultes de Supabase amb "joins" de vegades retornen relacions com arrays.
  // Aquí transformem les dades per assegurar-nos que tenen una estructura consistent abans de passar-les al client.
  const transformedOverdueInvoices = (overdueInvoicesRes.data || []).map(invoice => {
    return {
      ...invoice,
      // Suposem que cada factura té un sol contacte, per tant, agafem el primer de l'array.
      // Si l'array 'contacts' estigués buit, proporcionem un objecte per defecte per evitar errors.
      contacts: invoice.contacts?.[0] || { nom: 'Contacte desconegut' }
    };
  });
  // Creem un únic objecte 'initialData' que contindrà totes les dades que necessita el component de client.
  // Aquest patró és molt recomanat per mantenir el flux de dades net i organitzat.
  const initialData = {
    stats: {
      totalContacts: statsData.total_contacts || 0,
      activeClients: statsData.active_clients || 0,
      opportunities: statsData.opportunities || 0,
      invoiced: statsData.invoiced_current_month || 0,
      pending: statsData.pending_total || 0,
      expenses: statsData.expenses_current_month || 0,
      invoicedChange: calculatePercentageChange(
        statsData.invoiced_current_month || 0,
        statsData.invoiced_previous_month || 0
      ),
      expensesChange: calculatePercentageChange(
        statsData.expenses_current_month || 0,
        statsData.expenses_previous_month || 0
      ),
      invoicedIsPositive: (statsData.invoiced_current_month || 0) >= (statsData.invoiced_previous_month || 0),
      expensesIsPositive: (statsData.expenses_current_month || 0) <= (statsData.expenses_previous_month || 0),
    },
    tasks: tasksRes.data || [],
    contacts: contactsData,
    // ✅ CANVI: Utilitzem les dades ja transformades
      // Filtrem els contactes "freds" directament al servidor.
    overdueInvoices: transformedOverdueInvoices,
    attentionContacts: contactsData
      .filter((c: Contact) => c.last_interaction_at && new Date(c.last_interaction_at) < sevenDaysAgo)
      .slice(0, 5),
    aiInsights: aiInsightsRes.data || { summary: 'No disponible.', suggestion: 'Intenta-ho més tard.' },
  }
  // Finalment, renderitzem el component de client i li passem totes les dades ja carregades i processades.

  return <DashboardClient initialData={initialData} />
}
