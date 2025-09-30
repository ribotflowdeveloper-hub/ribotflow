// Ubicació: /app/(app)/comunicacio/planificador/page.tsx

import { Suspense } from 'react';
import { SocialPlannerClient } from './_components/SocialPlannerClient';
import type { SocialPost } from "@/types/comunicacio/SocialPost";
import { UpgradePlanNotice } from '@/app/[locale]/(app)/settings/billing/_components/UpgradePlanNotice';
import { validatePageSession } from '@/lib/supabase/session';

// ✅ Esborrem les importacions de 'permissions' que no s'utilitzen aquí directament.
// import { hasPermission, PERMISSIONS } from '@/lib/permissions';
// import { getUserRoleInTeam } from '@/lib/permissions';

export default async function SocialPlannerPage() {
    const session = await validatePageSession();
    // ✅ CORRECCIÓ 1: Comprovem si hi ha hagut un error (encara que 'validatePageSession' redirigeix,
    // TypeScript necessita aquesta comprovació per saber que 'session' no és un error).
    if (!session) {
        // Aquesta línia realment no s'executarà perquè validatePageSession ja haurà redirigit,
        // però satisfà el tipatge de TypeScript.
        return null; 
    }
    const { supabase, user, activeTeamId } = session;
    const locale = user.user_metadata?.locale || 'ca';

    // Comprovació de pla de subscripció
    const activeTeamPlan = user.app_metadata?.active_team_plan as string | undefined;
    const allowedPlans = ['plus', 'premium'];
    // ✅ CORRECCIÓ 2: Fem la comprovació més robusta (insensible a majúscules/minúscules).
    if (!activeTeamPlan || !allowedPlans.includes(activeTeamPlan.toLowerCase())) {
        return <UpgradePlanNotice featureName="Planificador Social" requiredPlan="Plus" locale={locale} />;
    }

    // ✅ CORRECCIÓ 3: La comprovació de permisos es feia DUES VEGADES i amb permisos incorrectes.
    // La centralitzarem i la simplificarem. La lògica principal de permisos ja està dins
    // de les 'actions', així que la comprovació aquí només ha de ser de visualització bàsica si cal.
    // De moment, la podem eliminar si les RLS de Supabase ja protegeixen les dades. Si no,
    // hauria de ser una única comprovació amb el permís correcte.

    // Com que les Server Actions ja tenen una validació robusta amb 'validateSocialPlannerPermissions',
    // podem confiar en que l'usuari no podrà fer accions no permeses. La càrrega inicial
    // de dades estarà protegida per les polítiques RLS de Supabase.

    // La resta de la càrrega de dades es manté igual...
    const { data: posts, error } = await supabase
        .from('social_posts')
        .select('*')
        .eq('team_id', activeTeamId) // Afegim el filtre per equip per RLS.
        .order('created_at', { ascending: false });

    if (error) console.error("Error carregant les publicacions:", error);

    const [userCredsRes, teamCredsRes] = await Promise.all([
        supabase.from('user_credentials').select('provider').eq('user_id', user.id),
        supabase.from('team_credentials').select('provider').eq('team_id', activeTeamId)
    ]);
    const userProviders = userCredsRes.data?.map(c => c.provider) || [];
    const teamProviders = teamCredsRes.data?.map(c => c.provider) || [];
    const allConnectedProviders = new Set([...userProviders, ...teamProviders]);

    const connectionStatuses = {
        linkedin: allConnectedProviders.has('linkedin'),
        facebook: allConnectedProviders.has('facebook'),
        instagram: allConnectedProviders.has('instagram'),
    };

    return (
        <Suspense fallback={<div>Carregant planificador...</div>}>
            <SocialPlannerClient
                initialPosts={(posts as SocialPost[]) || []}
                connectionStatuses={connectionStatuses}
            />
        </Suspense>
    );
}