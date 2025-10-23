// src/app/[locale]/(app)/crm/general/_components/CrmData.tsx

import { validatePageSession } from "@/lib/supabase/session";
import { CrmClient } from './crm-client';
import { type Database } from '@/types/supabase';
import { startOfMonth, subMonths, subDays, startOfDay, endOfDay } from 'date-fns';
// Afegeix aquests tipus nous a la part superior del teu fitxer
export type CampaignPerformanceData = {
    name: string;
    roi: number; // Retorn de la inversió (ingressos / cost)
    fill: string;
};

export type DailySummaryData = {
    tasks_completed: number;
    emails_sent: number;
    quotes_sent: number;
    meetings_held: number;
};
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
// Afegeix aquests tipus nous a la part superior del teu fitxer CrmData.tsx
export type OpportunityAgingData = {
    stage_name: string;
    avg_days: number;
};

export type LeadConversionData = {
    source: string;
    conversion_rate: number;
    total: number;
};
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
    // ✅ NOVES PROPIETATS
    opportunityAging: OpportunityAgingData[];
    leadConversion: LeadConversionData[];
    campaignPerformance: CampaignPerformanceData[];
    dailySummary: DailySummaryData;
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
    const thirtyDaysAgo = subDays(now, 30).toISOString();
    // Defineix el rang de dates per "avui"
    const todayStart = startOfDay(new Date()).toISOString();
    const todayEnd = endOfDay(new Date()).toISOString();
    const [
        contactsRes, newContactsRes, opportunitiesRes, paidInvoicesRes, wonOpportunitiesRes,
        contactsLastMonthRes, newContactsLastMonthRes, opportunitiesLastMonthRes, allOpportunitiesLastMonthRes, wonOpportunitiesLastMonthRes,
        funnelLeadsCountRes, funnelClientsCountRes, funnelQuotedCountRes,
        unreadActivitiesRes, topClientsRes, coldContactsRes, leadSourcesRes, paidInvoicesLastMonthRes, allOpportunitiesRes, campaignsRes,
        dailyTasksRes,
        dailyActivitiesRes,
        dailyQuotesRes,
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
        supabase.from('opportunities').select('created_at, stage_name, source, team_id').eq('team_id', activeTeamId),
        supabase.from('campaigns').select('name, cost, revenue_generated').eq('team_id', activeTeamId),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).eq('status', 'Completada').gte('due_date', todayStart).lte('due_date', todayEnd),
        supabase.from('activities').select('type', { count: 'exact' }).eq('team_id', activeTeamId).gte('created_at', todayStart).lte('created_at', todayEnd),
        supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).gte('sent_at', todayStart).lte('sent_at', todayEnd),
    ]);

    const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };
    // --- PROCESSAMENT: Rendiment de Campanyes de Màrqueting ---
    // Utilitzo dades de mostra ja que la taula no existeix a l'esquema, però la lògica és vàlida.
    const mockCampaigns = [
        { name: 'Campanya Estiu', cost: 500, revenue_generated: 1500 },
        { name: 'Black Friday', cost: 1000, revenue_generated: 4500 },
        { name: 'Llançament Producte', cost: 200, revenue_generated: 300 },
    ];
    const campaignColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f97316'];
    const campaignPerformance: CampaignPerformanceData[] = mockCampaigns.map((campaign, index) => ({
        name: campaign.name,
        roi: campaign.cost > 0 ? ((campaign.revenue_generated || 0) - campaign.cost) / campaign.cost * 100 : 0,
        fill: campaignColors[index % campaignColors.length],
    }));

    // --- PROCESSAMENT: Resum d'Activitat Diària ---
    const dailyActivities = dailyActivitiesRes.data || [];
    const dailySummary: DailySummaryData = {
        tasks_completed: dailyTasksRes.count ?? 0,
        emails_sent: dailyActivities.filter(a => a.type === 'Email').length,
        quotes_sent: dailyQuotesRes.count ?? 0,
        meetings_held: dailyActivities.filter(a => a.type === 'Reunió').length,
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
    // --- PROCESSAMENT: Antiguitat d'Oportunitats per Etapa ---
    const allOpportunities = allOpportunitiesRes.data || [];
    const agingData: Record<string, { total_days: number, count: number }> = {};

    allOpportunities
        .filter(op => op.stage_name !== 'Guanyat' && op.stage_name !== 'Perdut')
        .forEach(op => {
            if (!op.stage_name) return;
            if (!agingData[op.stage_name]) {
                agingData[op.stage_name] = { total_days: 0, count: 0 };
            }
            if (!op.created_at) return;
            const createdDate = new Date(op.created_at);
            const diffTime = Math.abs(now.getTime() - createdDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            agingData[op.stage_name].total_days += diffDays;
            agingData[op.stage_name].count++;
        });

    const opportunityAging: OpportunityAgingData[] = Object.entries(agingData).map(([stage_name, data]) => ({
        stage_name,
        avg_days: Math.round(data.total_days / data.count)
    }));


    // --- PROCESSAMENT: Taxa de Conversió per Font de Lead ---
    const conversionData: Record<string, { total: number, won: number }> = {};

    allOpportunities.forEach(op => {
        const source = op.source || 'Desconegut';
        if (!conversionData[source]) {
            conversionData[source] = { total: 0, won: 0 };
        }
        conversionData[source].total++;
        if (op.stage_name === 'Guanyat') {
            conversionData[source].won++;
        }
    });

    const leadConversion: LeadConversionData[] = Object.entries(conversionData).map(([source, data]) => ({
        source,
        conversion_rate: (data.won / data.total) * 100,
        total: data.total,
    }));
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
        opportunityAging,
        leadConversion,
        campaignPerformance,
        dailySummary,
    };

    return <CrmClient initialData={data} />;
}