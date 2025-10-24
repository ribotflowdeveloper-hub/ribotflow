import { SocialPlannerClient } from './SocialPlannerClient';
import { UpgradePlanNotice } from '@/app/[locale]/(app)/settings/billing/_components/UpgradePlanNotice';
import { validatePageSession } from '@/lib/supabase/session';
import { getSocialPlannerInitialData } from '@/lib/services/comunicacio/socialPlanner.service';
import type { SocialPost, ConnectionStatuses } from '@/lib/services/comunicacio/socialPlanner.service'; // Importem tipus del servei

// Re-exportem tipus per al client
export type { SocialPost, ConnectionStatuses };

// Plans permesos (pots moure'ls a config si vols)
const ALLOWED_PLANS = ['plus', 'premium'];

export async function SocialPlannerData() {
    const session = await validatePageSession();
    // validatePageSession ja gestiona redirecció si no hi ha sessió/equip
    // Però afegim comprovació per a TypeScript i possibles errors inesperats
    if (!session) return null;

    const { supabase, user, activeTeamId } = session;
    const locale = user.user_metadata?.locale || 'ca';

    // Comprovació de pla de subscripció
    const activeTeamPlan = user.app_metadata?.active_team_plan as string | undefined;
    if (!activeTeamPlan || !ALLOWED_PLANS.includes(activeTeamPlan.toLowerCase())) {
        return <UpgradePlanNotice featureName="Planificador Social" requiredPlan="Plus" locale={locale} />;
    }

    // Cridem al servei per obtenir les dades
    const { data, error } = await getSocialPlannerInitialData(supabase, user.id, activeTeamId);

    if (error || !data) {
        console.error("Error carregant les dades del Planificador Social (Component):", error);
        // Mostrem un estat d'error o buit
        // Podries passar un prop 'errorLoading' al client
        return (
            <SocialPlannerClient
                initialPosts={[]}
                connectionStatuses={{ linkedin: false, facebook: false, instagram: false }}
                // errorLoading="No s'han pogut carregar les dades."
            />
        );
    }

    return (
        <SocialPlannerClient
            initialPosts={data.posts}
            connectionStatuses={data.connectionStatuses}
        />
    );
}
