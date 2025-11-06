// /src/app/[locale]/(app)/comunicacio/marketing/_components/MarketingData.tsx (FITXER COMPLET I CORREGIT)

import { validateSessionAndPermission, PERMISSIONS } from '@/lib/permissions/permissions'; // ✅ 1. Importem guardians
import { MarketingClient } from './marketing-client';
import { AccessDenied } from '@/components/shared/AccessDenied'; // Importem AccessDenied
import { getUsageLimitStatus, type UsageCheckResult } from "@/lib/subscription/subscription"; // ✅ 2. Importem límits

import { marketingService } from '@/lib/services/comunicacio/marketing.service';
import type { Campaign, Kpis } from '@/types/comunicacio/marketing';
export type { Campaign, Kpis };

// Definim un estat de límit per defecte
const defaultLimit: UsageCheckResult = { allowed: false, current: 0, max: 0, error: "Sessió no vàlida" };

export async function MarketingData() {
    
    // ✅ 3. Validació de ROL (RBAC) per veure la pàgina
    const validation = await validateSessionAndPermission(PERMISSIONS.VIEW_MARKETING);
    if ('error' in validation) {
      return <AccessDenied message={validation.error.message} />;
    }
    const { supabase, activeTeamId } = validation;

    // ✅ 4. Carreguem dades i AMBDÓS límits en paral·lel
    const [
      { data, error },
      campaignLimit,
      aiActionsLimit
    ] = await Promise.all([
        marketingService.getMarketingPageData(supabase, activeTeamId),
        getUsageLimitStatus('maxMarketingCampaignsPerMonth'),
        getUsageLimitStatus('maxAIActionsPerMonth')
    ]);

    if (error || !data) {
        console.error("Error en obtenir les dades de màrqueting (MarketingData):", error);
        return (
          <MarketingClient 
            initialKpis={{ totalLeads: 0, conversionRate: 0 }} 
            initialCampaigns={[]} 
            campaignLimitStatus={campaignLimit || defaultLimit} // Passem límits fins i tot si falla
            aiActionsLimitStatus={aiActionsLimit || defaultLimit}
          />
        );
    }
    
    return (
      <MarketingClient 
        initialKpis={data.kpis} 
        initialCampaigns={data.campaigns} 
        campaignLimitStatus={campaignLimit} // ✅ 5. Passem els dos límits al client
        aiActionsLimitStatus={aiActionsLimit}
      />
    );
}