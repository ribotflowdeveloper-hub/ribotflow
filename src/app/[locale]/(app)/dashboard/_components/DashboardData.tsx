// src/app/[locale]/(app)/dashboard/_components/DashboardData.tsx

import React from 'react';
import { validatePageSession } from '@/lib/supabase/session';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '@/types/supabase';
import { DashboardClient } from '../dashboard-client';

import { EnrichedQuote } from './RecentQuotes';
import { EnrichedEmail } from './RecentEmails';

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
    // 1. Obtenim TOT el que necessitem d'UNA sola crida.
    const { supabase, user, activeTeamId } = await validatePageSession();

    const typedSupabase = supabase as SupabaseClient<Database>;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: permissions } = await typedSupabase
        .from('inbox_permissions')
        .select('target_user_id')
        .eq('team_id', activeTeamId) // ⬅️ Fem servir activeTeamId
        .eq('grantee_user_id', user.id);

    const visibleUserIds = [user.id, ...(permissions?.map(p => p.target_user_id) || [])];

    const [
        statsData,
        tasksData,
        overdueInvoicesData,
        contactsData,
        notificationsRes,
        departmentsRes,
        teamMembersRes,
        recentQuotesRes,
        recentEmailsRes,
    ] = await Promise.all([
        // 2. Passem 'activeTeamId' a les funcions que ho necessiten.
        getStats(typedSupabase), // ✅ PASSEM L'ID (hauràs d'actualitzar getStats)
        getTasks(typedSupabase, activeTeamId), // ✅ Fem servir activeTeamId
        getOverdueInvoices(typedSupabase, activeTeamId), // ✅ PASSEM L'ID (hauràs d'actualitzar getOverdueInvoices)
        getRecentContacts(typedSupabase, activeTeamId), // ✅ Fem servir activeTeamId
        typedSupabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false),
        typedSupabase.from('departments').select('*').eq('team_id', activeTeamId), // ✅ Fem servir activeTeamId
        typedSupabase.from('team_members_with_profiles').select('*').eq('team_id', activeTeamId), // ✅ Fem servir activeTeamId
        typedSupabase.from('quotes').select('*, contacts(nom)').eq('team_id', activeTeamId).order('created_at', { ascending: false }).limit(10), // ✅ Fem servir activeTeamId(10),

        // ✅ SOLUCIÓ DEFINITIVA: Consulta directa a la taula 'tickets'.
        // ✅ CONSULTA DE DIAGNÒSTIC: la fem el més simple possible.
        typedSupabase
            .from('tickets')
            .select('*, contacts(nom)')
            .in('user_id', visibleUserIds)
            .order('created_at', { ascending: false }) // Ordenem per creació, que sempre hi serà
            .limit(10)
    ]);
    // --- SECCIÓ DE DEPURACIÓ EXPLÍCITA ---
    console.log('\n\n--- INICI DEPURACIÓ DADES INBOX DASHBOARD ---');
    if (recentEmailsRes.error) {
        console.error('>> ERROR EN LA CONSULTA DIRECTA A "tickets":', recentEmailsRes.error);
    } else {
        console.log(`>> ÈXIT! La consulta ha retornat ${recentEmailsRes.data?.length ?? 0} tiquets.`);
        // Mostrem els IDs dels tiquets rebuts per verificar
        if (recentEmailsRes.data && recentEmailsRes.data.length > 0) {
            console.log('>> IDs dels tiquets rebuts:', recentEmailsRes.data.map(t => t.id));
        }
    }
    console.log('--- FI DEPURACIÓ ---\n\n');
    // ------------------------------------
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
        departments: departmentsRes.data ?? [],
        contacts: contactsData,
        overdueInvoices: overdueInvoicesData,
        attentionContacts: contactsData.filter((c) => c.last_interaction_at && new Date(c.last_interaction_at).toISOString() < sevenDaysAgo).slice(0, 5),
        notifications: notificationsRes.data ?? [],
        recentActivities: recentActivities,
        recentQuotes: (recentQuotesRes.data as EnrichedQuote[] | null) ?? [],
        // Assignem directament les dades de la consulta
        recentEmails: (recentEmailsRes.data as EnrichedEmail[] | null) ?? [],
    };

    return (
        <DashboardClient
            initialData={initialData}
            teamMembers={teamMembersRes.data as Tables<'team_members_with_profiles'>[] ?? []}
            userId={user.id}
            activeTeamId={activeTeamId} // ✅ LÍNIA AFEGIDA: Passem la propietat que faltava
        >
            {children}
        </DashboardClient>
    );
}