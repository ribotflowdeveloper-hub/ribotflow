/**
 * @file page.tsx (Dashboard)
 * @summary Aquest fitxer defineix la pàgina principal del Tauler de Control.
 * S'encarrega de carregar les dades essencials ràpidament i de fer streaming
 * dels components més lents, com l'Oracle d'IA, utilitzant Suspense.
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { DashboardClient } from './dashboard-client'
import React, { Suspense } from 'react'
import { Button } from '@/components/ui/button'

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

const calculatePercentageChange = (current: number, previous: number): string => {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) > 999) return change > 0 ? '+999%' : '-999%';
  return `${change >= 0 ? '+' : ''}${change.toFixed(0)}% vs mes anterior`;
};

// --- COMPONENTS PER A STREAMING ---

/**
 * @summary Aquest és l'esquelet de càrrega per a l'Oracle d'IA.
 * Es mostra a l'instant mentre les dades reals s'estan carregant en segon pla.
 */
function AIOracleSkeleton() {
  return (
    <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-gradient-to-br from-white/10 to-white/5 animate-pulse">
      <h2 className="text-xl font-bold text-white mb-3">Oracle d’IA</h2>
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-white/5 ring-1 ring-white/10">
          <p className="text-sm font-semibold text-white/90 mb-1">Resum</p>
          <div className="h-4 w-3/4 rounded bg-white/10"></div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 ring-1 ring-white/10">
          <p className="text-sm font-semibold text-white/90 mb-1">Suggeriment</p>
          <div className="h-4 w-full rounded bg-white/10 mb-1"></div>
          <div className="h-4 w-1/2 rounded bg-white/10"></div>
        </div>
        <Button variant="outline" className="w-full" disabled>
          Parlar amb l’assistent
        </Button>
      </div>
    </div>
  );
}

/**
 * @summary Component de servidor aïllat que carrega i mostra les dades de la IA.
 * Com que és un component 'async', React el pot suspendre fins que les dades estiguin llestes.
 */
async function AIOracle() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: aiInsights, error } = await supabase.functions.invoke('generate-ai-summary');

  // ✅ COMPROBACIÓN DE ERRORES AÑADIDA
  if (error) {
    // Registramos el error en la consola del servidor para poder depurarlo.
    console.error("Error al invocar la función de IA:", error.message);
    
    // Mostramos un estado de error claro en la interfaz de usuario.
    const errorMessage = "No se ha podido contactar con el Oracle de IA.";
    
    return (
      <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-500/30">
        <h2 className="text-xl font-bold text-white mb-3">Oracle d’IA</h2>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-red-500/10">
            <p className="text-sm font-semibold text-red-300 mb-1">Error</p>
            <p className="text-sm text-red-400">{errorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  // El resto de la lógica se mantiene igual si no hay error.
  const summary = aiInsights?.summary || 'No s’ha pogut carregar el resum.';
  const suggestion = aiInsights?.suggestion || 'Intenta-ho de nou més tard.';

  return (
    <div className="rounded-2xl p-6 ring-1 ring-white/10 bg-gradient-to-br from-white/10 to-white/5">
      <h2 className="text-xl font-bold text-white mb-3">Oracle d’IA</h2>
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-white/5 ring-1 ring-white/10">
          <p className="text-sm font-semibold text-white/90 mb-1">Resum</p>
          <p className="text-sm text-white/80">{summary}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/5 ring-1 ring-white/10">
          <p className="text-sm font-semibold text-white/90 mb-1">Suggeriment</p>
          <p className="text-sm text-white/80">{suggestion}</p>
        </div>
        <Button variant="outline" className="w-full">
          Parlar amb l’assistent
        </Button>
      </div>
    </div>
  );
}
// --- COMPONENT PRINCIPAL DE LA PÀGINA ---

export default async function DashboardPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // ✅ OPTIMITZACIÓ: Hem tret la crida a la IA ('aiInsightsRes') del Promise.all.
  const [statsRes, tasksRes, overdueInvoicesRes, contactsRes] = await Promise.all([
    supabase.rpc('get_dashboard_stats'),
    supabase.from('tasks').select('*').order('is_completed, created_at'),
    supabase.from('invoices').select('id, contacts(nom), due_date').in('status', ['Sent', 'Overdue']).lt('due_date', new Date().toISOString()),
    supabase.from('contacts').select('*').order('created_at', { ascending: false }),
  ]);

  const statsData = statsRes.data?.[0] || {};
  const contactsData = contactsRes.data || [];
  
  const transformedOverdueInvoices = (overdueInvoicesRes.data || []).map(invoice => ({
    ...invoice,
    contacts: invoice.contacts?.[0] || { nom: 'Contacte desconegut' }
  }));

  const initialData = {
    stats: {
      totalContacts: statsData.total_contacts || 0,
      activeClients: statsData.active_clients || 0,
      opportunities: statsData.opportunities || 0,
      invoiced: statsData.invoiced_current_month || 0,
      pending: statsData.pending_total || 0,
      expenses: statsData.expenses_current_month || 0,
      invoicedChange: calculatePercentageChange(statsData.invoiced_current_month || 0, statsData.invoiced_previous_month || 0),
      expensesChange: calculatePercentageChange(statsData.expenses_current_month || 0, statsData.expenses_previous_month || 0),
      invoicedIsPositive: (statsData.invoiced_current_month || 0) >= (statsData.invoiced_previous_month || 0),
      expensesIsPositive: (statsData.expenses_current_month || 0) <= (statsData.expenses_previous_month || 0),
    },
    tasks: tasksRes.data || [],
    contacts: contactsData,
    overdueInvoices: transformedOverdueInvoices,
    attentionContacts: contactsData
      .filter((c: Contact) => c.last_interaction_at && new Date(c.last_interaction_at) < sevenDaysAgo)
      .slice(0, 5),
    // ❌ La dada de la IA ja no es passa directament aquí.
  };
  
  // El component de client rep les dades ràpides.
  // El component de la IA es passa com a 'children' per ser gestionat per Suspense.
  return (
    <DashboardClient initialData={initialData}>
      <Suspense fallback={<AIOracleSkeleton />}>
        <AIOracle />
      </Suspense>
    </DashboardClient>
  );
}