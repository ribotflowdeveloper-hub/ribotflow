// src/app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

// Importem el component client que contindrà la lògica interactiva
import { DashboardClient } from './dashboard-client';

export const metadata: Metadata = {
  title: 'Tauler Principal | Ribot',
};

// Aquesta pàgina és un SERVER COMPONENT. S'executa només al servidor.
export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // 1. Obtenim la sessió de l'usuari de forma segura al servidor
  const { data: { session } } = await supabase.auth.getSession();

  // Si no hi ha sessió, el middleware ja hauria d'haver redirigit,
  // però aquesta és una doble comprovació de seguretat.
  if (!session) {
    redirect('/login');
  }

  // 2. Realitzem totes les crides a la base de dades en paral·lel al servidor
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [statsRes, tasksRes, overdueInvoicesRes, contactsRes, aiInsightsRes] = await Promise.all([
    supabase.rpc('get_dashboard_stats'),
    supabase.from('tasks').select('*').order('is_completed, created_at'),
    supabase.from('invoices').select('id, contacts(nom), due_date').in('status', ['Sent', 'Overdue']).lt('due_date', new Date().toISOString()),
    supabase.from('contacts').select('*').order('created_at', { ascending: false }),
    supabase.functions.invoke('generate-ai-summary'), // Invoquem la Edge Function de forma segura
  ]);

  // 3. Processem les dades obtingudes per passar-les al component client
  // (Pots afegir una gestió d'errors més robusta aquí si cal)
  const statsData = statsRes.data?.[0] || {};
  const contactsData = contactsRes.data || [];
  
  const initialData = {
    stats: {
      totalContacts: statsData.total_contacts || 0,
      opportunities: statsData.opportunities || 0,
      invoiced: statsData.invoiced_current_month || 0,
      pending: statsData.pending_total || 0,
      // ... la resta de les teves estadístiques
    },
    tasks: tasksRes.data || [],
    contacts: contactsData,
    overdueInvoices: overdueInvoicesRes.data || [],
    attentionContacts: contactsData.filter(c => c.last_interaction_at && new Date(c.last_interaction_at) < new Date(sevenDaysAgo)).slice(0, 5),
    aiInsights: aiInsightsRes.data || { summary: "No disponible", suggestion: "Intenta-ho més tard." },
  };

  // 4. Renderitzem el component client, passant les dades com a props
  return <DashboardClient initialData={initialData} />;
}