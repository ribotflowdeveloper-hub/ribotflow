// src/app/[locale]/(app)/crm/general/_components/CrmData.tsx

import { validatePageSession } from "@/lib/supabase/session";
import { CrmClient } from './crm-client';
import { type Database } from '@/types/supabase';
import { startOfMonth, subMonths, endOfMonth, subDays } from 'date-fns';

// TIPUS DE DADES (SENSE CANVIS)
export type KpiData = {
    value: number | string;
    trend: number;
};
export type UnreadActivity = Database['public']['Tables']['activities']['Row'] & {
  contacts: Pick<Database['public']['Tables']['contacts']['Row'], 'nom' | 'email'> | null;
};
export type TopClient = { id: number; nom: string | null; total_invoiced: number; };
export type ColdContact = Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom' | 'last_interaction_at'>;
export type LeadSource = { source: string; count: number; };

export type CrmData = {
    stats: {
        totalContacts: KpiData;
        newContactsThisMonth: KpiData;
        opportunities: KpiData;
        pipelineValue: KpiData;
        avgRevenuePerClient: KpiData;
        conversionRate: KpiData;
        salesVelocity: KpiData;
        avgConversionTimeDays: KpiData;
    };
    funnel: {
        leads: number;
        quoted: number;
        clients: number;
    };
    revenue: {
        monthlyForecast: number;
        currentMonthRevenue: number;
    };
    unreadActivities: UnreadActivity[];
    topClients: TopClient[];
    coldContacts: ColdContact[];
    leadSources: LeadSource[];
};
export type ComposeEmailData = { contactId: number; to: string; subject: string; body: string; };


export async function CrmData() {
    const session = await validatePageSession();
    if ('error' in session) {
        return <CrmClient initialData={null} />;
    }
    const { supabase, activeTeamId } = session;

    // --- RANGS DE DATES ---
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now).toISOString();
    const startOfLastMonth = startOfMonth(subMonths(now, 1)).toISOString();
    const endOfLastMonth = endOfMonth(subMonths(now, 1)).toISOString();
    const thirtyDaysAgo = subDays(now, 30).toISOString();

    const [
        contactsRes, newContactsRes, opportunitiesRes, paidInvoicesRes, wonOpportunitiesRes,
        contactsLastMonthRes, newContactsLastMonthRes, opportunitiesLastMonthRes, allOpportunitiesLastMonthRes, wonOpportunitiesLastMonthRes,
        funnelLeadsCountRes, funnelClientsCountRes, funnelQuotedCountRes,
        unreadActivitiesRes, topClientsRes, coldContactsRes, leadSourcesRes, paidInvoicesLastMonthRes
    ] = await Promise.all([
        // Dades del mes actual
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).gte('created_at', startOfCurrentMonth),
        supabase.from('opportunities').select('value', { count: 'exact' }).eq('team_id', activeTeamId).not('stage_name', 'in', '("Guanyat", "Perdut")'),
        supabase.from('invoices').select('total_amount, contact_id, issue_date').eq('team_id', activeTeamId).eq('status', 'Paid'),
        supabase.from('opportunities').select('created_at, last_updated_at, value').eq('team_id', activeTeamId).eq('stage_name', 'Guanyat').gte('last_updated_at', startOfCurrentMonth),
        
        // Dades del mes anterior per comparar
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).lt('created_at', startOfCurrentMonth),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).gte('created_at', startOfLastMonth).lt('created_at', startOfCurrentMonth),
        supabase.from('opportunities').select('value', { count: 'exact' }).eq('team_id', activeTeamId).not('stage_name', 'in', '("Guanyat", "Perdut")').gte('created_at', startOfLastMonth).lt('created_at', startOfCurrentMonth),
        supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).gte('created_at', startOfLastMonth).lt('created_at', startOfCurrentMonth),
        supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).eq('stage_name', 'Guanyat').gte('last_updated_at', startOfLastMonth).lt('last_updated_at', startOfCurrentMonth),

        // Altres dades
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).eq('estat', 'Lead'),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).eq('estat', 'Client'),
        supabase.from('quotes').select('contact_id', { count: 'exact' }).eq('team_id', activeTeamId).not('contact_id', 'is', null),
        supabase.from('activities').select('*, contacts(nom, email)').eq('team_id', activeTeamId).eq('is_read', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('invoices').select('total_amount, contacts(id, nom)').eq('team_id', activeTeamId).eq('status', 'Paid'),
        supabase.from('contacts').select('id, nom, last_interaction_at').eq('team_id', activeTeamId).lt('last_interaction_at', thirtyDaysAgo).order('last_interaction_at', { ascending: true }).limit(5),
        supabase.from('opportunities').select('source').eq('team_id', activeTeamId),
        supabase.from('invoices').select('total_amount, contact_id').eq('team_id', activeTeamId).eq('status', 'Paid').gte('issue_date', startOfLastMonth).lt('issue_date', startOfCurrentMonth),
    ]);
    
    const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const totalContacts = contactsRes.count ?? 0;
    const totalContactsLastMonth = contactsLastMonthRes.count ?? 0;
    const newContactsThisMonth = newContactsRes.count ?? 0;
    const newContactsLastMonth = newContactsLastMonthRes.count ?? 0;
    
    const opportunitiesCount = opportunitiesRes.count ?? 0;
    const opportunitiesCountLastMonth = opportunitiesLastMonthRes.count ?? 0;
    const pipelineValue = opportunitiesRes.data?.reduce((sum, op) => sum + (op.value ?? 0), 0) ?? 0;
    const pipelineValueLastMonth = opportunitiesLastMonthRes.data?.reduce((sum, op) => sum + (op.value ?? 0), 0) ?? 0;
    
    const wonOpportunities = wonOpportunitiesRes.data ?? [];
    const wonOpportunitiesLastMonthCount = wonOpportunitiesLastMonthRes.count ?? 0;
    const totalOpportunitiesCreatedLastMonth = allOpportunitiesLastMonthRes.count ?? 0;
    const conversionRate = (funnelLeadsCountRes.count ?? 0) > 0 ? ((funnelClientsCountRes.count ?? 0) / (funnelLeadsCountRes.count ?? 1)) * 100 : 0;
    const conversionRateLastMonth = totalOpportunitiesCreatedLastMonth > 0 ? (wonOpportunitiesLastMonthCount / totalOpportunitiesCreatedLastMonth) * 100 : 0;
    
    const totalConversionTime = wonOpportunities.reduce((sum, op) => {
        if (op.created_at && op.last_updated_at) return sum + (new Date(op.last_updated_at).getTime() - new Date(op.created_at).getTime());
        return sum;
    }, 0);
    const avgConversionTimeDays = wonOpportunities.length > 0 ? Math.round(totalConversionTime / wonOpportunities.length / (1000 * 60 * 60 * 24)) : 0;
    
    const avgDealValue = wonOpportunities.length > 0 ? wonOpportunities.reduce((sum, op) => sum + (op.value ?? 0), 0) / wonOpportunities.length : 0;
    const salesVelocity = avgConversionTimeDays > 0 ? (opportunitiesCount * avgDealValue * (conversionRate / 100)) / avgConversionTimeDays : 0;

    const paidInvoices = paidInvoicesRes.data ?? [];
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
    const uniqueClientsWithRevenue = new Set(paidInvoices.map(inv => inv.contact_id)).size;
    const avgRevenuePerClient = uniqueClientsWithRevenue > 0 ? totalRevenue / uniqueClientsWithRevenue : 0;
    const totalRevenueLastMonth = (paidInvoicesLastMonthRes.data ?? []).reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
    const uniqueClientsLastMonth = new Set((paidInvoicesLastMonthRes.data ?? []).map(inv => inv.contact_id)).size;
    const avgRevenuePerClientLastMonth = uniqueClientsLastMonth > 0 ? totalRevenueLastMonth / uniqueClientsLastMonth : 0;
    
    const clientRevenue = (topClientsRes.data ?? []).reduce<Record<string, { id: number, nom: string | null, total: number }>>((acc, inv) => {
        const contact = inv.contacts;
        if (contact) {
            if (!acc[contact.id]) acc[contact.id] = { id: contact.id, nom: contact.nom, total: 0 };
            acc[contact.id].total += inv.total_amount ?? 0;
        }
        return acc;
    }, {});
    const topClients: TopClient[] = Object.values(clientRevenue).sort((a, b) => b.total - a.total).slice(0, 5).map(c => ({ id: c.id, nom: c.nom, total_invoiced: c.total }));
    
    const leadSourcesData = leadSourcesRes.data || [];
    const leadSourcesCount = leadSourcesData.reduce<Record<string, number>>((acc, op) => {
        const source = op.source || 'Desconegut';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});
    const leadSources: LeadSource[] = Object.entries(leadSourcesCount).map(([source, count]) => ({ source, count }));

    const data: CrmData = {
        stats: {
            totalContacts: { value: totalContacts, trend: calculateTrend(totalContacts, totalContactsLastMonth) },
            newContactsThisMonth: { value: newContactsThisMonth, trend: calculateTrend(newContactsThisMonth, newContactsLastMonth) },
            opportunities: { value: opportunitiesCount, trend: calculateTrend(opportunitiesCount, opportunitiesCountLastMonth) },
            pipelineValue: { value: `€${pipelineValue.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`, trend: calculateTrend(pipelineValue, pipelineValueLastMonth) },
            avgRevenuePerClient: { value: `€${avgRevenuePerClient.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`, trend: calculateTrend(avgRevenuePerClient, avgRevenuePerClientLastMonth) },
            conversionRate: { value: `${conversionRate.toFixed(1)}%`, trend: calculateTrend(conversionRate, conversionRateLastMonth) },
            salesVelocity: { value: `€${salesVelocity.toFixed(0)}/dia`, trend: 0 }, // Trend not calculated for simplicity
            avgConversionTimeDays: { value: `${avgConversionTimeDays} dies`, trend: 0 }, // Trend not calculated
        },
        funnel: {
             leads: funnelLeadsCountRes.count ?? 0, 
             quoted: new Set(funnelQuotedCountRes.data?.map(q => q.contact_id)).size,
             clients: funnelClientsCountRes.count ?? 0 
        },
        revenue: {
            monthlyForecast: pipelineValue * (conversionRate / 100),
            currentMonthRevenue: paidInvoices.filter(inv => inv.issue_date && new Date(inv.issue_date).getMonth() === now.getMonth()).reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0),
        },
        unreadActivities: (unreadActivitiesRes.data as UnreadActivity[]) || [],
        topClients: topClients,
        coldContacts: (coldContactsRes.data as ColdContact[]) || [],
        leadSources: leadSources,
    };
    
    return <CrmClient initialData={data} />;
}