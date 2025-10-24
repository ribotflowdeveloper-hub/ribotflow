import { type Tables } from '@/types/supabase';
import { type RawCrmDataResults } from './data.service'; // Importa el tipus de dades brutes
// Afegeix la importació o definició del tipus CrmData
import type { CrmData } from '../crm.service'; // Assegura't que CrmData està exportat a crm.service.ts, o canvia el path segons correspongui

// Helper privat si només s'usa aquí
const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
};

// Abans _processStats
export function processStats(rawData: RawCrmDataResults): CrmData['stats'] {
    const totalContacts = rawData.contactsRes.count ?? 0;
    const totalContactsLastMonth = rawData.contactsLastMonthRes.count ?? 0;
    const newContactsThisMonth = rawData.newContactsRes.count ?? 0;
    const newContactsLastMonth = rawData.newContactsLastMonthRes.count ?? 0;
    const opportunitiesCount = rawData.opportunitiesRes.count ?? 0;
    const opportunitiesCountLastMonth = rawData.opportunitiesLastMonthRes.count ?? 0;

    type OpportunityValue = Pick<Tables<'opportunities'>, 'value'>;
    const pipelineValue = rawData.opportunitiesRes.data?.reduce((sum: number, op: OpportunityValue) => sum + (op.value ?? 0), 0) ?? 0;
    const pipelineValueLastMonth = rawData.opportunitiesLastMonthRes.data?.reduce((sum: number, op: OpportunityValue) => sum + (op.value ?? 0), 0) ?? 0;

    type PaidInvoice = Pick<Tables<'invoices'>, 'total_amount' | 'contact_id' | 'issue_date'>;
    const paidInvoices = rawData.paidInvoicesRes.data ?? [];
    const totalRevenue = paidInvoices.reduce((sum: number, inv: PaidInvoice) => sum + (inv.total_amount ?? 0), 0);
    const uniqueClientsWithRevenue = new Set(paidInvoices.map(inv => inv.contact_id).filter(Boolean)).size;
    const avgRevenuePerClient = uniqueClientsWithRevenue > 0 ? totalRevenue / uniqueClientsWithRevenue : 0;

    type PaidInvoiceLastMonth = Pick<Tables<'invoices'>, 'total_amount' | 'contact_id'>;
    const paidInvoicesLastMonth = rawData.paidInvoicesLastMonthRes.data ?? [];
    const totalRevenueLastMonth = paidInvoicesLastMonth.reduce((sum: number, inv: PaidInvoiceLastMonth) => sum + (inv.total_amount ?? 0), 0);
    const uniqueClientsLastMonth = new Set(paidInvoicesLastMonth.map(inv => inv.contact_id).filter(Boolean)).size;
    const avgRevenuePerClientLastMonth = uniqueClientsLastMonth > 0 ? totalRevenueLastMonth / uniqueClientsLastMonth : 0;

    const funnelLeadsCount = rawData.funnelLeadsCountRes.count ?? 0;
    const funnelClientsCount = rawData.funnelClientsCountRes.count ?? 0;
    const conversionRate = funnelLeadsCount > 0 ? (funnelClientsCount / funnelLeadsCount) * 100 : 0;
    const totalOpportunitiesCreatedLastMonth = rawData.allOpportunitiesLastMonthRes.count ?? 0;
    const wonOpportunitiesLastMonthCount = rawData.wonOpportunitiesLastMonthRes.count ?? 0;
    const conversionRateLastMonth = totalOpportunitiesCreatedLastMonth > 0 ? (wonOpportunitiesLastMonthCount / totalOpportunitiesCreatedLastMonth) * 100 : 0;

    type WonOpportunityTiming = Pick<Tables<'opportunities'>, 'created_at' | 'last_updated_at' | 'value'>;
    const wonOpportunities = rawData.wonOpportunitiesRes.data ?? [];
    const totalConversionTimeMillis = wonOpportunities.reduce((sum: number, op: WonOpportunityTiming) => {
        if (op.created_at && op.last_updated_at) {
          const timeDiff = new Date(op.last_updated_at).getTime() - new Date(op.created_at).getTime();
          return sum + (timeDiff > 0 ? timeDiff : 0);
        }
        return sum;
    }, 0);
    const avgConversionTimeDays = wonOpportunities.length > 0 ? Math.round(totalConversionTimeMillis / wonOpportunities.length / (1000 * 60 * 60 * 24)) : 0;
    const avgDealValue = wonOpportunities.length > 0 ? wonOpportunities.reduce((sum: number, op: WonOpportunityTiming) => sum + (op.value ?? 0), 0) / wonOpportunities.length : 0;
    const salesVelocity = avgConversionTimeDays > 0 ? (opportunitiesCount * avgDealValue * (conversionRate / 100)) / avgConversionTimeDays : 0;

    return {
        totalContacts: { value: totalContacts, trend: calculateTrend(totalContacts, totalContactsLastMonth) },
        newContactsThisMonth: { value: newContactsThisMonth, trend: calculateTrend(newContactsThisMonth, newContactsLastMonth) },
        opportunities: { value: opportunitiesCount, trend: calculateTrend(opportunitiesCount, opportunitiesCountLastMonth) },
        pipelineValue: { value: `€${pipelineValue.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`, trend: calculateTrend(pipelineValue, pipelineValueLastMonth) },
        avgRevenuePerClient: { value: `€${avgRevenuePerClient.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`, trend: calculateTrend(avgRevenuePerClient, avgRevenuePerClientLastMonth) },
        conversionRate: { value: `${conversionRate.toFixed(1)}%`, trend: calculateTrend(conversionRate, conversionRateLastMonth) },
        salesVelocity: { value: `€${salesVelocity.toLocaleString('es-ES', { maximumFractionDigits: 0 })}/dia`, trend: 0 },
        avgConversionTimeDays: { value: `${avgConversionTimeDays} dies`, trend: 0 },
    };
}