// src/app/[locale]/(app)/crm/general/_components/CrmData.tsx

import { validatePageSession } from "@/lib/supabase/session";
import { CrmClient } from './crm-client';
import { type Database } from '@/types/supabase';
import { startOfMonth, subDays } from 'date-fns';

export type UnreadActivity = Database['public']['Tables']['activities']['Row'] & {
  contacts: Pick<Database['public']['Tables']['contacts']['Row'], 'nom' | 'email'> | null;
};
export type TopClient = { id: number; nom: string | null; total_invoiced: number; };
export type ColdContact = Pick<Database['public']['Tables']['contacts']['Row'], 'id' | 'nom' | 'last_interaction_at'>;
export type LeadSource = { source: string; count: number; };

export type CrmData = {
  stats: {
    totalContacts: number;
    newContactsThisMonth: number;
    opportunities: number;
    pipelineValue: number;
    avgRevenuePerClient: number;
    avgConversionTimeDays: number;
  };
  funnel: {
    leads: number;
    quoted: number;
    clients: number;
  };
  unreadActivities: UnreadActivity[];
  topClients: TopClient[];
  coldContacts: ColdContact[];
  bestMonths: { month: string; total: number }[];
  leadSources: LeadSource[];
};

export type ComposeEmailData = { contactId: number; to: string; subject: string; body: string; };

export async function CrmData() {
    const session = await validatePageSession();
    if ('error' in session) {
        console.error("CrmData: Sessió invàlida.");
        return <CrmClient initialData={null} />;
    }
    const { supabase, activeTeamId } = session;

    const startOfCurrentMonth = startOfMonth(new Date()).toISOString();
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

    const [
        contactsCountRes, newContactsCountRes, opportunitiesRes,
        funnelLeadsCountRes, funnelClientsCountRes, funnelQuotedCountRes,
        unreadActivitiesRes, topClientsRes, coldContactsRes,
        paidInvoicesRes, wonOpportunitiesRes, leadSourcesRes,
    ] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).gte('created_at', startOfCurrentMonth),
        supabase.from('opportunities').select('value', { count: 'exact' }).eq('team_id', activeTeamId).not('stage_name', 'in', '("Guanyat", "Perdut")'),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).eq('estat', 'Lead'),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', activeTeamId).eq('estat', 'Client'),
        supabase.from('quotes').select('contact_id', { count: 'exact' }).eq('team_id', activeTeamId).not('contact_id', 'is', null),
        supabase.from('activities').select('*, contacts(nom, email)').eq('team_id', activeTeamId).eq('is_read', false).order('created_at', { ascending: false }).limit(5),
        supabase.from('invoices').select('total_amount, contacts(id, nom)').eq('team_id', activeTeamId).eq('status', 'Paid'),
        supabase.from('contacts').select('id, nom, last_interaction_at').eq('team_id', activeTeamId).lt('last_interaction_at', thirtyDaysAgo).order('last_interaction_at', { ascending: true }).limit(5),
        supabase.from('invoices').select('total_amount, contact_id, issue_date').eq('team_id', activeTeamId).eq('status', 'Paid'),
        supabase.from('opportunities').select('created_at, last_updated_at').eq('team_id', activeTeamId).eq('stage_name', 'Guanyat').not('last_updated_at', 'is', null),
        supabase.from('opportunities').select('source').eq('team_id', activeTeamId),
    ]);
    
    // --- Processament de Dades ---
    const totalContacts = contactsCountRes.count ?? 0;
    const newContactsThisMonth = newContactsCountRes.count ?? 0;
    const opportunities = opportunitiesRes.count ?? 0;
    const pipelineValue = opportunitiesRes.data?.reduce((sum, op) => sum + (op.value ?? 0), 0) ?? 0;
    const paidInvoices = paidInvoicesRes.data ?? [];
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
    const uniqueClientsWithRevenue = new Set(paidInvoices.map(inv => inv.contact_id)).size;
    const avgRevenuePerClient = uniqueClientsWithRevenue > 0 ? totalRevenue / uniqueClientsWithRevenue : 0;
    const monthlyRevenue = paidInvoices.reduce<Record<string, number>>((acc, inv) => {
        if(inv.issue_date) {
            const month = inv.issue_date.substring(0, 7);
            acc[month] = (acc[month] || 0) + (inv.total_amount ?? 0);
        }
        return acc;
    }, {});
    const bestMonths = Object.entries(monthlyRevenue).sort(([, a], [, b]) => b - a).slice(0, 3).map(([month, total]) => ({ month, total }));
    const wonOpportunities = wonOpportunitiesRes.data ?? [];
    const totalConversionTime = wonOpportunities.reduce((sum, op) => {
        if (op.created_at && op.last_updated_at) {
            const diff = new Date(op.last_updated_at).getTime() - new Date(op.created_at).getTime();
            return sum + diff;
        }
        return sum;
    }, 0);
    const avgConversionTimeMillis = wonOpportunities.length > 0 ? totalConversionTime / wonOpportunities.length : 0;
    const avgConversionTimeDays = Math.round(avgConversionTimeMillis / (1000 * 60 * 60 * 24));
    const funnelLeads = funnelLeadsCountRes.count ?? 0;
    const funnelClients = funnelClientsCountRes.count ?? 0;
    const uniqueQuotedContacts = new Set(funnelQuotedCountRes.data?.map(q => q.contact_id)).size;
    const clientRevenue = (topClientsRes.data ?? []).reduce<Record<string, { id: number, nom: string | null, total: number }>>((acc, inv) => {
        const contact = inv.contacts;
        if (contact) {
            if (!acc[contact.id]) {
                acc[contact.id] = { id: contact.id, nom: contact.nom, total: 0 };
            }
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
        stats: { totalContacts, newContactsThisMonth, opportunities, pipelineValue, avgRevenuePerClient, avgConversionTimeDays },
        funnel: { leads: funnelLeads, quoted: uniqueQuotedContacts, clients: funnelClients },
        unreadActivities: (unreadActivitiesRes.data as UnreadActivity[]) || [],
        topClients: topClients,
        coldContacts: (coldContactsRes.data as ColdContact[]) || [],
        bestMonths: bestMonths,
        leadSources: leadSources,
    };
    
    return <CrmClient initialData={data} />;
}