import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { DashboardClient } from './dashboard-client'

export const metadata: Metadata = {
  title: 'Tauler Principal | Ribot',
}
export interface Contact {
  id: string;
  nom: string;
  email?: string;
  phone?: string;
  last_interaction_at?: string | null;
}

// Funció d'ajuda per calcular canvis percentuals (s'executa al servidor)
const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) > 999) return change > 0 ? '+999%' : '-999%';
  return `${change >= 0 ? '+' : ''}${change.toFixed(0)}% vs mes anterior`;
};

export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // ✅ CANVI: Utilitzem getUser() que és el mètode recomanat per a RLS en Server Components
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [statsRes, tasksRes, overdueInvoicesRes, contactsRes, aiInsightsRes] = await Promise.all([
    supabase.rpc('get_dashboard_stats'),
    supabase.from('tasks').select('*').order('is_completed, created_at'),
    supabase
      .from('invoices')
      .select('id, contacts(nom), due_date') // Aquesta consulta retorna contacts com un array
      .in('status', ['Sent', 'Overdue'])
      .lt('due_date', new Date().toISOString()),
    supabase.from('contacts').select('*').order('created_at', { ascending: false }),
    supabase.functions.invoke('generate-ai-summary'),
  ])

  const statsData = statsRes.data?.[0] || {};
  const contactsData = contactsRes.data || [];

  // ✅ CANVI: Transformem les dades de les factures vençudes per ajustar la seva forma
  const transformedOverdueInvoices = (overdueInvoicesRes.data || []).map(invoice => {
    return {
      ...invoice,
      // Suposem que cada factura té un sol contacte, per tant, agafem el primer de l'array.
      // Si l'array 'contacts' estigués buit, proporcionem un objecte per defecte per evitar errors.
      contacts: invoice.contacts?.[0] || { nom: 'Contacte desconegut' }
    };
  });

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
    overdueInvoices: transformedOverdueInvoices,
    attentionContacts: contactsData
      .filter((c: Contact) => c.last_interaction_at && new Date(c.last_interaction_at) < sevenDaysAgo)
      .slice(0, 5),
    aiInsights: aiInsightsRes.data || { summary: 'No disponible.', suggestion: 'Intenta-ho més tard.' },
  }

  return <DashboardClient initialData={initialData} />
}
