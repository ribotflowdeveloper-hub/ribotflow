import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { MarketingClient } from './marketing-client';
import type { Campaign, Kpis } from '../page';

export async function MarketingData() {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        return redirect('/settings/team');
    }

    // ✅ CORRECCIÓ: Canviem 'team_id_param' per 'p_team_id'
    // per a coincidir amb la definició de la funció a la base de dades.
    const { data, error } = await supabase.rpc('get_marketing_page_data', {
        p_team_id: activeTeamId 
    });

    if (error) {
        console.error("Error en obtenir les dades de màrqueting:", error);
        // Passem valors per defecte per evitar que el component client es trenqui.
        return <MarketingClient initialKpis={{ totalLeads: 0, conversionRate: 0 }} initialCampaigns={[]} />;
    }
    
    const kpis: Kpis = data?.kpis || { totalLeads: 0, conversionRate: 0 };
    const campaigns: Campaign[] = data?.campaigns || [];

    return <MarketingClient initialKpis={kpis} initialCampaigns={campaigns} />;
}