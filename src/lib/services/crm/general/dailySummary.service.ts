import { type Tables } from '@/types/supabase';
// ✅ CORRECCIÓ: Importem des del fitxer d'origen dels tipus
import { type RawCrmDataResults } from './types'; 
import { type DailySummaryData } from '../../crm.service'; // Importa el tipus des de l'arxiu principal

// Abans _processDailySummary
export function processDailySummary(rawData: RawCrmDataResults): DailySummaryData {
    const dailyActivities = rawData.dailyActivitiesRes.data || [];
    // ✅ CORRECCIÓ: Tipus explícit per a 'a' dins del filter
    type DailyActivity = Pick<Tables<'activities'>, 'type'>; 
    return {
        tasks_completed: 0, // Fixat a 0 temporalment
        emails_sent: dailyActivities.filter((a: DailyActivity) => a.type === "Email").length,
        quotes_sent: rawData.dailyQuotesRes.count ?? 0,
        meetings_held: dailyActivities.filter((a: DailyActivity) => a.type === "Reunió").length,
    };
}