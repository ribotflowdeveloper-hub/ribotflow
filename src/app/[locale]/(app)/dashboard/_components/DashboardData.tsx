import { DashboardClient } from '../dashboard-client';
import React from 'react';
import { validatePageSession } from '@/lib/supabase/session';
import { getActiveTeam } from '@/lib/supabase/teams'; // Correció #2: Importem la funció per obtenir l'equip
import { Database } from '@/types/supabase';
import { Tables } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js'; // Correció #1: Importem el tipus SupabaseClient
import { TaskWithContact } from '@/types/dashboard/types'; // Importem el nou tipus

const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) > 999) return change > 0 ? '+999%' : '-999%';
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}% vs mes anterior`;
};

type DashboardStats = {
    total_contacts: number;
    active_clients: number;
    opportunities: number;
    invoiced_current_month: number;
    invoiced_previous_month: number;
    pending_total: number;
    expenses_current_month: number;
    expenses_previous_month: number;
};


export async function DashboardData({ children }: { children: React.ReactNode }) {
    // La validació de sessió retorna supabase i user
    const { supabase, user } = await validatePageSession();

    // Obtenim l'equip actiu per separat
    const team = await getActiveTeam();

    if (!team) {
        return <div>No s'ha trobat un equip actiu.</div>;
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Tipem el client de Supabase (ara funciona perquè hem importat SupabaseClient)
    const typedSupabase = supabase as SupabaseClient<Database>;

    const [statsRes, tasksRes, overdueInvoicesRes, contactsRes, notificationsRes,  departmentsRes] = await Promise.all([
        typedSupabase.rpc('get_dashboard_stats'),
        // Fem les consultes utilitzant l'ID de l'equip que hem obtingut
        // ✅ CORRECCIÓ: Fem un "join" per obtenir el nom del contacte associat a cada tasca
        typedSupabase.from('tasks').select('*, contacts(id, nom), departments(id, name)')
            .eq('team_id', team.id)
            .order('is_completed, created_at'), typedSupabase.from('invoices').select('*, contacts(nom)').in('status', ['Sent', 'Overdue']).lt('due_date', new Date().toISOString()),
        typedSupabase.from('contacts').select('*').eq('team_id', team.id).order('created_at', { ascending: false }),
        typedSupabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false),
        typedSupabase.from('departments').select('*').eq('team_id', team.id)

    ]);

    const departmentsData: Tables<'departments'>[] = departmentsRes.data ?? [];

    const statsData: DashboardStats = statsRes.data?.[0] || {
        total_contacts: 0,
        active_clients: 0,
        opportunities: 0,
        invoiced_current_month: 0,
        invoiced_previous_month: 0,
        pending_total: 0,
        expenses_current_month: 0,
        expenses_previous_month: 0,
    };

    const tasksData: TaskWithContact[] = tasksRes.data ?? [];
    const contactsData: Tables<'contacts'>[] = contactsRes.data ?? [];
    const notificationsData: Tables<'notifications'>[] = notificationsRes.data ?? [];

    const overdueInvoicesData: (Tables<'invoices'> & { contacts: { nom: string } | null })[] = overdueInvoicesRes.data ?? [];

    const transformedOverdueInvoices = overdueInvoicesData.map(invoice => ({
        ...invoice,
        contacts: invoice.contacts
    }));

    const initialData = {
        stats: {
            totalContacts: statsData.total_contacts,
            activeClients: statsData.active_clients,
            opportunities: statsData.opportunities,
            invoiced: statsData.invoiced_current_month,
            pending: statsData.pending_total,
            expenses: statsData.expenses_current_month,
            invoicedChange: calculatePercentageChange(statsData.invoiced_current_month, statsData.invoiced_previous_month),
            expensesChange: calculatePercentageChange(statsData.expenses_current_month, statsData.expenses_previous_month),
            invoicedIsPositive: statsData.invoiced_current_month >= statsData.invoiced_previous_month,
            expensesIsPositive: statsData.expenses_current_month <= statsData.expenses_previous_month,
        },
        tasks: tasksData,
        departments: departmentsData, // Passem els departaments al client
        contacts: contactsData,
        overdueInvoices: transformedOverdueInvoices,
        attentionContacts: contactsData
            .filter((c) => c.last_interaction_at && new Date(c.last_interaction_at) < sevenDaysAgo)
            .slice(0, 5),
        notifications: notificationsData,
    };

    return (
        <DashboardClient initialData={initialData}>
            {children}
        </DashboardClient>
    );
}