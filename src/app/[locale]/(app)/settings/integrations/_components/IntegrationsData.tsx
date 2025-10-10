
import { validatePageSession } from "@/lib/supabase/session"; // ✅ 1. Importem l'assistent
import { IntegrationsClient } from "./IntegrationsClient";
import { getTranslations } from "next-intl/server";

export async function IntegrationsData() {
    const t = await getTranslations('SettingsPage.integrations');
    const { supabase, user, activeTeamId } = await validatePageSession();


    // Busquem les credencials personals (lligades a user_id)
    // I les credencials de l'equip actiu (lligades a team_id) en paral·lel.
    const [userCredsRes, teamCredsRes] = await Promise.all([
        supabase.from('user_credentials').select('provider').eq('user_id', user.id),
        supabase.from('team_credentials').select('provider').eq('team_id', activeTeamId)
    ]);

    const userProviders = userCredsRes.data?.map(c => c.provider) || [];
    const teamProviders = teamCredsRes.data?.map(c => c.provider) || [];

    const allConnectedProviders = new Set([...userProviders, ...teamProviders]);

    const connectionStatuses = {
        google: allConnectedProviders.has('google'),
        microsoft: allConnectedProviders.has('microsoft'),
        linkedin: allConnectedProviders.has('linkedin'),
        facebook: allConnectedProviders.has('facebook'),
        instagram: allConnectedProviders.has('instagram'),
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">{t('pageTitle')}</h1>
            <IntegrationsClient initialConnectionStatuses={connectionStatuses} />
        </div>
    );
}