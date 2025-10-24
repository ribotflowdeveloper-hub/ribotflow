import { type Tables } from '@/types/supabase';
import { type RawCrmDataResults, type LeadSource, type OpportunityAgingData, type LeadConversionData } from './types'; // Importa tipus

// Abans _processCharts
export function processCharts(rawData: RawCrmDataResults): {
    leadSources: LeadSource[];
    opportunityAging: OpportunityAgingData[];
    leadConversion: LeadConversionData[];
} {
    const now = new Date(); // Necessari per aging

    // Lead Sources
    type OpportunitySource = Pick<Tables<'opportunities'>, 'source'>;
    const leadSourcesData = rawData.leadSourcesRes.data || [];
    const leadSourcesCount = leadSourcesData.reduce<Record<string, number>>((acc, op: OpportunitySource) => {
        const source = op.source || 'Desconegut';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});
    const leadSources: LeadSource[] = Object.entries(leadSourcesCount).map(([source, count]) => ({ source, count }));

    // Opportunity Aging & Conversion by Source
    type OpportunityForProcessing = Pick<Tables<'opportunities'>, 'created_at' | 'stage_name' | 'source'>;
    const allOpportunities = (rawData.allOpportunitiesRes.data || []) as OpportunityForProcessing[];

    const agingData: Record<string, { total_days: number; count: number }> = {};
    const conversionData: Record<string, { total: number; won: number }> = {};

    allOpportunities.forEach(op => {
        const source = op.source || 'Desconegut';
        // Processament Conversió
        if (!conversionData[source]) conversionData[source] = { total: 0, won: 0 };
        conversionData[source].total++;
        if (op.stage_name === 'Guanyat') conversionData[source].won++;

        // Processament Aging (només si no està tancada)
        if (op.stage_name !== null && op.stage_name !== 'Guanyat' && op.stage_name !== 'Perdut') {
             if (op.created_at) {
                const stageName = op.stage_name;
                if (!agingData[stageName]) agingData[stageName] = { total_days: 0, count: 0 };
                const createdDate = new Date(op.created_at);
                const diffTime = Math.abs(now.getTime() - createdDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                agingData[stageName].total_days += diffDays;
                agingData[stageName].count++;
             }
        }
    });

    const opportunityAging: OpportunityAgingData[] = Object.entries(agingData).map(([stage_name, data]) => ({
        stage_name,
        avg_days: data.count > 0 ? Math.round(data.total_days / data.count) : 0
    }));
    const leadConversion: LeadConversionData[] = Object.entries(conversionData).map(([source, data]) => ({
        source,
        conversion_rate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0,
        total: data.total,
    }));

    return { leadSources, opportunityAging, leadConversion };
}