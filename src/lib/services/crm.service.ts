import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

// Importa els tipus principals des del nou arxiu
import { 
    type CrmData, 
    type CrmServiceResponse,
    type CampaignPerformanceData, // Re-exporta els tipus necessaris per al component
    type DailySummaryData, 
    type KpiData, 
    type UnreadActivity, 
    type TopClient, 
    type ColdContact, 
    type LeadSource, 
    type OpportunityAgingData, 
    type LeadConversionData 
} from './crm/general/types';

// Importa les funcions de servei modulars
import { fetchAllCrmRawData } from './crm/general/data.service';
import { processStats } from './crm/general/stats.service';
import { processFunnel } from './crm/general/funnel.service';
import { processRevenue } from './crm/general/revenue.service';
import { processLists } from './crm/general/lists.service';
import { processCharts } from './crm/general/charts.service';
import { processCampaignPerformance } from './crm/general/campaignPerformance.service';
import { processDailySummary } from './crm/general/dailySummary.service';


/**
 * Obté i processa TOTES les dades per al Dashboard del CRM (Cas d'Ús).
 * Orquestra l'obtenció i processament de dades des de serveis específics.
 */
export async function getCrmDashboardData(
  supabase: SupabaseClient<Database>,
  teamId: string,
): CrmServiceResponse {
    try {
        // 1. Obtenir totes les dades brutes
        const rawData = await fetchAllCrmRawData(supabase, teamId);

        // 2. Processar les dades en blocs lògics
        const stats = processStats(rawData);
        const funnel = processFunnel(rawData);
        const revenue = processRevenue(rawData, stats); // Passa stats si és necessari
        const lists = processLists(rawData);
        const charts = processCharts(rawData);
        const campaignPerformance = processCampaignPerformance(); // Usa mocks internament
        const dailySummary = processDailySummary(rawData);

        // 3. Construir l'objecte final
        const data: CrmData = {
            stats,
            funnel,
            revenue,
            unreadActivities: lists.unreadActivities,
            topClients: lists.topClients,
            coldContacts: lists.coldContacts,
            leadSources: charts.leadSources,
            opportunityAging: charts.opportunityAging,
            leadConversion: charts.leadConversion,
            campaignPerformance,
            dailySummary,
        };

        return { data, error: null };

    } catch (err: unknown) {
        const error = err as Error;
        // L'error ja s'hauria logat a fetchAllCrmRawData si és de Supabase
        if (!error.message.startsWith('Error carregant dades CRM')) {
             console.error("Error catastròfic processant dades a getCrmDashboardData (service):", error.message, error.stack);
        }
        return {
            data: null,
            // Retornem l'error capturat (pot ser de fetch o de processament)
            error: { message: `Error inesperat obtenint dades del CRM: ${error.message}`, details: error }
        };
    }
}

// Re-exporta els tipus necessaris per al component CrmDataDashboard
export type { CampaignPerformanceData, DailySummaryData, KpiData, UnreadActivity, TopClient, ColdContact, LeadSource, OpportunityAgingData, LeadConversionData, CrmData };