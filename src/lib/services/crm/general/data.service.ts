// src/lib/services/crm/data.service.ts

import { type SupabaseClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { startOfMonth, subMonths, subDays, startOfDay, endOfDay } from 'date-fns';
import { type RawCrmDataResults} from './types'; // Importem els tipus necessaris

// Helper per definir els tipus de retorn de cada promesa individualment
// Això fa que el resultat de Promise.all sigui un tuple amb tipus coneguts
const definePromises = (supabase: SupabaseClient<Database>, teamId: string, dates: ReturnType<typeof getDateRanges>) => {
    const { startOfCurrentMonth, startOfLastMonth, thirtyDaysAgo, todayStart, todayEnd } = dates;

    // Definim cada promesa amb el seu tipus de retorn esperat
    return [
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', teamId), // 0
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', teamId).gte('created_at', startOfCurrentMonth), // 1
        supabase.from('opportunities').select('value', { count: 'exact' }).eq('team_id', teamId).not('stage_name', 'in', '("Guanyat", "Perdut")'), // 2
        supabase.from('invoices').select('total_amount, contact_id, issue_date').eq('team_id', teamId).eq('status', 'Paid'), // 3
        supabase.from('opportunities').select('created_at, last_updated_at, value').eq('team_id', teamId).eq('stage_name', 'Guanyat').gte('last_updated_at', startOfCurrentMonth), // 4
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', teamId).lt('created_at', startOfCurrentMonth), // 5
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', teamId).gte('created_at', startOfLastMonth).lt('created_at', startOfCurrentMonth), // 6
        supabase.from('opportunities').select('value', { count: 'exact' }).eq('team_id', teamId).not('stage_name', 'in', '("Guanyat", "Perdut")').gte('created_at', startOfLastMonth).lt('created_at', startOfCurrentMonth), // 7
        supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('team_id', teamId).gte('created_at', startOfLastMonth).lt('created_at', startOfCurrentMonth), // 8
        supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('stage_name', 'Guanyat').gte('last_updated_at', startOfLastMonth).lt('last_updated_at', startOfCurrentMonth), // 9
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('estat', 'Lead'), // 10
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('team_id', teamId).eq('estat', 'Client'), // 11
        supabase.from('quotes').select('contact_id').eq('team_id', teamId).not('contact_id', 'is', null), // 12
        supabase.from('activities').select('*, contacts(nom, email)').eq('team_id', teamId).eq('is_read', false).order('created_at', { ascending: false }).limit(5), // 13
        supabase.from('invoices').select('total_amount, contacts(id, nom)').eq('team_id', teamId).eq('status', 'Paid'), // 14
        supabase.from('contacts').select('id, nom, last_interaction_at').eq('team_id', teamId).lt('last_interaction_at', thirtyDaysAgo).order('last_interaction_at', { ascending: true }).limit(5), // 15
        supabase.from('opportunities').select('source').eq('team_id', teamId), // 16
        supabase.from('invoices').select('total_amount, contact_id').eq('team_id', teamId).eq('status', 'Paid').gte('issue_date', startOfLastMonth).lt('issue_date', startOfCurrentMonth), // 17
        supabase.from('opportunities').select('created_at, stage_name, source').eq('team_id', teamId), // 18
        supabase.from('activities').select('type').eq('team_id', teamId).gte('created_at', todayStart).lte('created_at', todayEnd), // 19
        supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('team_id', teamId).gte('sent_at', todayStart).lte('sent_at', todayEnd), // 20
    ] as const; // ✅ Usar 'as const' ajuda TypeScript a inferir un tuple type
};

// Helper per a les dates
const getDateRanges = (now: Date = new Date()) => ({
    now,
    startOfCurrentMonth: startOfMonth(now).toISOString(),
    startOfLastMonth: startOfMonth(subMonths(now, 1)).toISOString(),
    thirtyDaysAgo: subDays(now, 30).toISOString(),
    todayStart: startOfDay(now).toISOString(),
    todayEnd: endOfDay(now).toISOString(),
});


// Funció principal per obtenir les dades
export async function fetchAllCrmRawData(supabase: SupabaseClient<Database>, teamId: string): Promise<RawCrmDataResults> {

    const dates = getDateRanges();
    const promises = definePromises(supabase, teamId, dates);

    // ✅ Promise.all ara retorna un tuple amb tipus inferits gràcies a 'as const'
    const results = await Promise.all(promises);

    // Mapeig manual (ara hauria de ser type-safe si els índexs són correctes)
    const namedResults: RawCrmDataResults = {
        contactsRes: results[0], newContactsRes: results[1], opportunitiesRes: results[2], paidInvoicesRes: results[3], wonOpportunitiesRes: results[4],
        contactsLastMonthRes: results[5], newContactsLastMonthRes: results[6], opportunitiesLastMonthRes: results[7], allOpportunitiesLastMonthRes: results[8], wonOpportunitiesLastMonthRes: results[9],
        funnelLeadsCountRes: results[10], funnelClientsCountRes: results[11], funnelQuotedCountRes: results[12],
        // Castings explícits per a resultats amb joins complexos que TS potser no infereix perfectament
        unreadActivitiesRes: results[13] as unknown as RawCrmDataResults['unreadActivitiesRes'],
        topClientsRes: results[14] as unknown as RawCrmDataResults['topClientsRes'],
        coldContactsRes: results[15] as unknown as RawCrmDataResults['coldContactsRes'],
        leadSourcesRes: results[16], paidInvoicesLastMonthRes: results[17], allOpportunitiesRes: results[18],
        dailyActivitiesRes: results[19], dailyQuotesRes: results[20],
        dailyTasksRes: { data: null, error: null, count: 0 }, // Dummy
    };

    // Comprovació d'errors (simplificada)
    const queryNames = Object.keys(namedResults);
    for (let i = 0; i < promises.length; i++) { // Iterem sobre l'índex de promeses/resultats
        const res = results[i]; // Accedim al resultat per índex
        if (res.error) {
            const queryName = queryNames[i] || `Consulta Índex ${i}`;
            console.error(`🚨 Error en la consulta "${queryName}":`, res.error);
            throw new Error(`Error carregant dades CRM (${queryName}): ${res.error.message || 'Error desconegut (possible RLS?)'}`);
        }
    }

    // Retornem l'objecte amb tipus correcte
    return namedResults;
}