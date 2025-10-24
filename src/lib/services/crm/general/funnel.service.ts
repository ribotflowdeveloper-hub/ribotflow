import { type RawCrmDataResults, type CrmData } from './types'; // Importa tipus

// Abans _processFunnel
export function processFunnel(rawData: RawCrmDataResults): CrmData['funnel'] {
    const funnelLeadsCount = rawData.funnelLeadsCountRes.count ?? 0;
    const funnelClientsCount = rawData.funnelClientsCountRes.count ?? 0;
    // Comptem contactes únics que han rebut pressupost
    const funnelQuotedContacts = new Set(rawData.funnelQuotedCountRes.data?.map(q => q.contact_id).filter(Boolean) ?? []).size;

    return {
        leads: funnelLeadsCount,
        quoted: funnelQuotedContacts,
        clients: funnelClientsCount,
    };
}