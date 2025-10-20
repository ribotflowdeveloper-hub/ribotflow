// src/app/[locale]/(app)/dashboard/DashboardData.tsx

import React from 'react';
import { validatePageSession } from '@/lib/supabase/session';
import { getActiveTeam } from '@/lib/supabase/teams';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '@/types/supabase';
import { DashboardClient } from '../dashboard-client';

// ✅ CORRECCIÓ: Hem eliminat la importació de 'EnrichedTask' perquè ja no es necessita aquí.
// El tipus s'infereix correctament de la funció getTasks.

import {
    getStats,
    getTasks,
    getOverdueInvoices,
    getRecentContacts,
    getRecentActivities,
} from '@/lib/data/dashboard';

const calculatePercentageChange = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}% vs mes anterior`;
};

export async function DashboardData({ children }: { children: React.ReactNode }) {
    const { supabase, user } = await validatePageSession();
    const team = await getActiveTeam();

    if (!team) {
        return <div>No s'ha trobat un equip actiu.</div>;
    }

    const typedSupabase = supabase as SupabaseClient<Database>;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [statsData, tasksData, overdueInvoicesData, contactsData, notificationsData, departmentsData, teamMembersData] = await Promise.all([
        getStats(typedSupabase),
        getTasks(typedSupabase, team.id),
        getOverdueInvoices(typedSupabase),
        getRecentContacts(typedSupabase, team.id),
        typedSupabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false).then(res => res.data ?? []),
        typedSupabase.from('departments').select('*').eq('team_id', team.id).then(res => res.data ?? []),
        typedSupabase.from('team_members_with_profiles').select('*').eq('team_id', team.id).then(res => res.data ?? []),
    ]);
    
    const recentActivities = getRecentActivities(overdueInvoicesData, tasksData, contactsData);

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
        departments: departmentsData,
        contacts: contactsData,
        overdueInvoices: overdueInvoicesData,
        attentionContacts: contactsData.filter((c) => c.last_interaction_at && new Date(c.last_interaction_at).toISOString() < sevenDaysAgo).slice(0, 5),
        notifications: notificationsData,
        recentActivities: recentActivities,
    };

    return (
        <DashboardClient
            initialData={initialData}
            teamMembers={teamMembersData as Tables<'team_members_with_profiles'>[]}
            userId={user.id}
        >
            {children}
        </DashboardClient>
    );
}