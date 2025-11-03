// src/app/[locale]/(app)/comunicacio/marketing/_components/MarketingData.tsx

import { validatePageSession } from '@/lib/supabase/session';
import { MarketingClient } from './marketing-client';

// ✅ 1. Importem el nostre servei
import { marketingService } from '@/lib/services/comunicacio/marketing.service';

// ✅ 2. Importem els tipus des de la nostra font de la veritat
import type { Campaign, Kpis } from '@/types/comunicacio/marketing';

// ✅ 3. Re-exportem els tipus per al Client Component (bona pràctica)
export type { Campaign, Kpis };

/**
 * @summary Component de servidor que obté les dades de màrqueting
 * utilitzant el servei centralitzat.
 */
export async function MarketingData() {
    const { supabase, activeTeamId } = await validatePageSession();

    // ✅ 4. Cridem al servei en lloc de l'RPC directament
    const { data, error } = await marketingService.getMarketingPageData(
      supabase,
      activeTeamId 
    );

    // ✅ 5. La gestió d'errors és més senzilla
    // El servei ja ens retorna un 'fallbackData' si 'data' és nul,
    // així que 'data' sempre hauria de ser un objecte vàlid si no hi ha error.
    if (error || !data) {
        console.error("Error en obtenir les dades de màrqueting (MarketingData):", error);
        // Retornem un estat buit en cas d'error
        return <MarketingClient 
            initialKpis={{ totalLeads: 0, conversionRate: 0 }} 
            initialCampaigns={[]} 
        />;
    }
    
    // ✅ 6. Passem les dades netes del servei al client
    return <MarketingClient 
        initialKpis={data.kpis} 
        initialCampaigns={data.campaigns} 
    />;
}