// Ubicació: /app/(app)/comunicacio/marketing/_components/MarketingData.tsx

import { validatePageSession } from '@/lib/supabase/session'; // ✅ Importem el helper correcte
import { MarketingClient } from './marketing-client';
import type { Campaign, Kpis } from '../page';

export async function MarketingData() {
    // ✅ La validació de sessió és ara una sola línia!
    const { supabase, activeTeamId } = await validatePageSession();

    const { data, error } = await supabase.rpc('get_marketing_page_data', {
        p_team_id: activeTeamId 
    });

    if (error) {
        console.error("Error en obtenir les dades de màrqueting:", error);
        return <MarketingClient initialKpis={{ totalLeads: 0, conversionRate: 0 }} initialCampaigns={[]} />;
    }
    
    const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);

    type MarketingPageData = { kpis: Kpis; campaigns: Campaign[] };
    const typedData = isObject ? (data as MarketingPageData) : undefined;

    const kpis: Kpis = typedData && typedData.kpis ? typedData.kpis : { totalLeads: 0, conversionRate: 0 };
    const campaigns: Campaign[] = typedData && typedData.campaigns ? typedData.campaigns : [];

    return <MarketingClient initialKpis={kpis} initialCampaigns={campaigns} />;
}