import { type Tables } from '@/types/supabase';
import { type RawCrmDataResults, type CrmData } from './types'; // Importa tipus
import { startOfMonth } from 'date-fns';

// Abans _processRevenue
export function processRevenue(
    rawData: RawCrmDataResults,
    // Rep els stats ja processats per obtenir pipelineValue i conversionRate
    stats: CrmData['stats']
): CrmData['revenue'] {
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now).toISOString();

    const paidInvoices = rawData.paidInvoicesRes.data ?? [];
    type PaidInvoice = Pick<Tables<'invoices'>, 'total_amount' | 'contact_id' | 'issue_date'>;

    const currentMonthRevenue = paidInvoices
        .filter(inv => inv.issue_date && new Date(inv.issue_date) >= new Date(startOfCurrentMonth))
        .reduce((sum: number, inv: PaidInvoice) => sum + (inv.total_amount ?? 0), 0);

    // Parsejem pipelineValue i conversionRate dels stats processats
    const pipelineValue = parseFloat(String(stats.pipelineValue.value).replace(/[€.]/g, '').replace(',', '.')) || 0;
    const conversionRate = parseFloat(String(stats.conversionRate.value).replace('%', '')) || 0;

    return {
        monthlyForecast: pipelineValue * (conversionRate / 100),
        currentMonthRevenue: currentMonthRevenue,
    };
}