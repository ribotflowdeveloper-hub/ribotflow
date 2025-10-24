import { type Tables } from '@/types/supabase';
import { type RawCrmDataResults, type UnreadActivity, type TopClient, type ColdContact } from './types'; // Importa tipus

// Abans _processLists
export function processLists(rawData: RawCrmDataResults): {
    unreadActivities: UnreadActivity[];
    topClients: TopClient[];
    coldContacts: ColdContact[];
} {
    const unreadActivities = (rawData.unreadActivitiesRes.data as UnreadActivity[] ?? []);

    type TopClientInvoice = Pick<Tables<'invoices'>, 'total_amount'> & {
        contacts: Pick<Tables<'contacts'>, 'id' | 'nom'> | null
    };
    const clientRevenueMap = (rawData.topClientsRes.data ?? []).reduce<Record<string, { id: number; nom: string | null; total: number }>>((acc, inv: TopClientInvoice) => {
        const contact = inv.contacts;
        if (contact && contact.id) {
            if (!acc[contact.id]) acc[contact.id] = { id: contact.id, nom: contact.nom, total: 0 };
            acc[contact.id].total += inv.total_amount ?? 0;
        }
        return acc;
    }, {});
    const topClients: TopClient[] = Object.values(clientRevenueMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(c => ({ id: c.id, nom: c.nom, total_invoiced: c.total }));

    const coldContacts = (rawData.coldContactsRes.data as ColdContact[] ?? []);

    return { unreadActivities, topClients, coldContacts };
}