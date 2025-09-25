import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "./IntegrationsClient";
import { getTranslations } from "next-intl/server";

export async function IntegrationsData() {
    const t = await getTranslations('SettingsIntegrationsPage');
    const supabase = createClient(cookies());

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // Obtenim l'ID de l'equip actiu des del token de l'usuari
    const activeTeamId = user.app_metadata?.active_team_id;
    if (!activeTeamId) {
        // Si no hi ha equip actiu, no es poden gestionar les integracions d'equip
        return redirect('/settings/team');
    }

    // Busquem les credencials personals (lligades a user_id)
    // I les credencials de l'equip actiu (lligades a team_id)
    const [userCredsRes, teamCredsRes] = await Promise.all([
        supabase.from('user_credentials').select('provider').eq('user_id', user.id),
        supabase.from('team_credentials').select('provider').eq('team_id', activeTeamId)
    ]);

    const userProviders = userCredsRes.data?.map(c => c.provider) || [];
    const teamProviders = teamCredsRes.data?.map(c => c.provider) || [];
    
    // Unim totes les connexions actives
    const allConnectedProviders = new Set([...userProviders, ...teamProviders]);

    const connectionStatuses = {
        google: allConnectedProviders.has('google'),       // Personal
        microsoft: allConnectedProviders.has('microsoft'), // Personal
        linkedin: allConnectedProviders.has('linkedin'),   // D'equip
        facebook: allConnectedProviders.has('facebook'),   // D'equip
        instagram: allConnectedProviders.has('instagram'), // D'equip
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">{t('pageTitle')}</h1>
            <IntegrationsClient initialConnectionStatuses={connectionStatuses} />
        </div>
    );
}