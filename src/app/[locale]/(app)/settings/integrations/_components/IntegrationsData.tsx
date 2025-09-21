// ✅ 1. Importem 'getTranslations' des de 'next-intl/server'
import { getTranslations } from 'next-intl/server';
import { createClient } from "@/lib/supabase/server";
import { IntegrationsClient } from "./IntegrationsClient";

export async function IntegrationsData() {
    // ✅ 2. Utilitzem 'await getTranslations' en lloc de 'useTranslations'
    const t = await getTranslations('SettingsIntegrationsPage');
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: credentials } = await supabase
        .from('user_credentials')
        .select('provider')
        .eq('user_id', user.id);

    const connectedProviders = credentials?.map(c => c.provider) || [];

    const connectionStatuses = {
        google: connectedProviders.includes('google'),
        microsoft: connectedProviders.includes('microsoft'),
        linkedin: connectedProviders.includes('linkedin_oidc'),
        facebook: connectedProviders.includes('facebook'),
        instagram: connectedProviders.includes('instagram'),
    };

    return (
        <div>
            {/* Ara 't' és una funció obtinguda de forma segura al servidor */}
            <h1 className="text-3xl font-bold mb-8">{t('pageTitle')}</h1>
            <IntegrationsClient initialConnectionStatuses={connectionStatuses} />
        </div>
    );
}