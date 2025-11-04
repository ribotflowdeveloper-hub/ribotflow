// src/app/[locale]/(app)/settings/integrations/_components/IntegrationsData.tsx (FITXER CORREGIT I NET)
import { validatePageSession } from "@/lib/supabase/session"; 
import { IntegrationsClient } from "./IntegrationsClient";
import { getTranslations } from "next-intl/server";

// ✅ 1. Importem el NOU servei
import * as integrationsService from '@/lib/services/settings/integrations/integrations.service';

export async function IntegrationsData() {
    const t = await getTranslations('SettingsPage.integrations');
    
    // ✅ 2. Validació de sessió neta
    const { supabase, user, activeTeamId } = await validatePageSession();

    // ✅ 3. Crida al SERVEI per obtenir dades
    // Tota la lògica de 'Promise.all', 'map' i 'Set' s'ha mogut al servei.
    const connectionStatuses = await integrationsService.getIntegrationStatuses(
      supabase,
      user.id,
      activeTeamId
    );

    // 4. Renderitzat del Client Component
    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">{t('pageTitle')}</h1>
            <IntegrationsClient initialConnectionStatuses={connectionStatuses} />
        </div>
    );
}