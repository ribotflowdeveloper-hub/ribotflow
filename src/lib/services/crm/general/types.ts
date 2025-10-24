// src/lib/services/crm/types.ts

import {  type Tables } from '@/types/supabase';
import { type PostgrestError } from '@supabase/supabase-js';

// --- Tipus de Dades Específics del Dashboard ---
export type CampaignPerformanceData = {
    name: string;
    roi: number | typeof Infinity;
    fill: string;
};
export type DailySummaryData = {
    tasks_completed: number;
    emails_sent: number;
    quotes_sent: number;
    meetings_held: number;
};
export type KpiData = {
    value: number | string;
    trend: number;
};
export type UnreadActivity = Tables<'activities'> & {
    contacts: Pick<Tables<'contacts'>, 'nom' | 'email'> | null;
};
export type TopClient = { id: number; nom: string | null; total_invoiced: number; };
export type ColdContact = Pick<Tables<'contacts'>, 'id' | 'nom' | 'last_interaction_at'>;
export type LeadSource = { source: string; count: number; };
export type OpportunityAgingData = {
    stage_name: string;
    avg_days: number;
};
export type LeadConversionData = {
    source: string;
    conversion_rate: number;
    total: number;
};

// --- Payload Principal ---
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
        quoted: number; // Nombre de contactes únics amb pressupost
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
    opportunityAging: OpportunityAgingData[];
    leadConversion: LeadConversionData[];
    campaignPerformance: CampaignPerformanceData[];
    dailySummary: DailySummaryData;
};

// --- Tipus de Retorn del Servei Principal ---
export type CrmServiceResponse = Promise<{ data: CrmData | null; error: { message: string, details?: unknown } | null }>;

// --- Tipus per a les Dades Brutes Obtingudes ---
// Definim un tipus genèric per a les respostes de Supabase amb possibles errors
type SupabaseResponse<T> = { data: T | null; error: PostgrestError | null; count?: number | null };

// Usem el tipus genèric per definir RawCrmDataResults
export type RawCrmDataResults = {
    contactsRes: SupabaseResponse<Pick<Tables<'contacts'>, 'id'>[]>;
    newContactsRes: SupabaseResponse<Pick<Tables<'contacts'>, 'id'>[]>;
    opportunitiesRes: SupabaseResponse<Pick<Tables<'opportunities'>, 'value'>[]>;
    paidInvoicesRes: SupabaseResponse<Pick<Tables<'invoices'>, 'total_amount' | 'contact_id' | 'issue_date'>[]>;
    wonOpportunitiesRes: SupabaseResponse<Pick<Tables<'opportunities'>, 'created_at' | 'last_updated_at' | 'value'>[]>;
    contactsLastMonthRes: SupabaseResponse<Pick<Tables<'contacts'>, 'id'>[]>;
    newContactsLastMonthRes: SupabaseResponse<Pick<Tables<'contacts'>, 'id'>[]>;
    opportunitiesLastMonthRes: SupabaseResponse<Pick<Tables<'opportunities'>, 'value'>[]>;
    allOpportunitiesLastMonthRes: SupabaseResponse<Pick<Tables<'opportunities'>, 'id'>[]>;
    wonOpportunitiesLastMonthRes: SupabaseResponse<Pick<Tables<'opportunities'>, 'id'>[]>;
    funnelLeadsCountRes: SupabaseResponse<Pick<Tables<'contacts'>, 'id'>[]>;
    funnelClientsCountRes: SupabaseResponse<Pick<Tables<'contacts'>, 'id'>[]>;
    funnelQuotedCountRes: SupabaseResponse<Pick<Tables<'quotes'>, 'contact_id'>[]>;
    unreadActivitiesRes: SupabaseResponse<UnreadActivity[]>;
    topClientsRes: SupabaseResponse<(Pick<Tables<'invoices'>, 'total_amount'> & { contacts: Pick<Tables<'contacts'>, 'id' | 'nom'> | null })[]>;
    coldContactsRes: SupabaseResponse<ColdContact[]>;
    leadSourcesRes: SupabaseResponse<Pick<Tables<'opportunities'>, 'source'>[]>;
    paidInvoicesLastMonthRes: SupabaseResponse<Pick<Tables<'invoices'>, 'total_amount' | 'contact_id'>[]>;
    allOpportunitiesRes: SupabaseResponse<Pick<Tables<'opportunities'>, 'created_at' | 'stage_name' | 'source'>[]>;
    dailyActivitiesRes: SupabaseResponse<Pick<Tables<'activities'>, 'type'>[]>;
    dailyQuotesRes: SupabaseResponse<Pick<Tables<'quotes'>, 'id'>[]>;
    dailyTasksRes: { data: null; error: null; count: number }; // Resultat dummy
};