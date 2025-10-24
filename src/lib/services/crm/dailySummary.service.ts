import { type Tables } from '@/types/supabase';
import { type RawCrmDataResults } from './data.service';
import { type DailySummaryData } from '../crm.service'; // Importa el tipus des de l'arxiu principal

// Abans _processDailySummary
export function processDailySummary(rawData: RawCrmDataResults): DailySummaryData {
    const dailyActivities = rawData.dailyActivitiesRes.data || [];
    type DailyActivityType = Pick<Tables<'activities'>, 'type'>;
    return {
        tasks_completed: 0, // Fixat a 0 temporalment
        emails_sent: dailyActivities.filter((a: DailyActivityType) => a.type === "Email").length,
        quotes_sent: rawData.dailyQuotesRes.count ?? 0,
        meetings_held: dailyActivities.filter((a: DailyActivityType) => a.type === "Reunió").length,
    };
}