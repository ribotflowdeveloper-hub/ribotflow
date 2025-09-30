import { Suspense } from 'react';
import { SocialPlannerClient } from './_components/SocialPlannerClient';
import type { SocialPost } from "@/types/comunicacio/SocialPost";
import { UpgradePlanNotice } from '@/app/[locale]/(app)/settings/billing/_components/UpgradePlanNotice';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { validatePageSession } from '@/lib/supabase/session'; // ✅ Importem la nostra funció
import { getUserRoleInTeam } from '@/lib/permissions'; // ✅ Importem una altra funció d'ajuda

export default async function SocialPlannerPage() {
    const { supabase, user, activeTeamId } = await validatePageSession();
    const locale = user.user_metadata?.locale || 'ca'; // Obtenim el locale de l'usuari

    // Comprovació de pla de subscripció (es manté igual)
    const activeTeamPlan = user.app_metadata?.active_team_plan;
    const allowedPlans = ['plus', 'premium'];
    if (!activeTeamPlan || !allowedPlans.includes(activeTeamPlan)) {
        return <UpgradePlanNotice featureName="Planificador Social" requiredPlan="Plus" locale={locale} />;
    }

    // ✅ Comprovació de permisos centralitzada
    const userRole = await getUserRoleInTeam(supabase, user.id, activeTeamId);
    if (!hasPermission(userRole, PERMISSIONS.MANAGE_INTEGRATIONS)) {
        return <AccessDenied />;
    }

    // La resta de la càrrega de dades es manté igual...
    const { data: posts, error } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) console.error("Error carregant les publicacions (pot ser per RLS):", error);


    // La càrrega de les connexions ara ha de ser híbrida
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

    const { data: member } = await supabase
        .from('team_members')
        .select('role')
        .match({ user_id: user.id, team_id: activeTeamId })
        .single();

    // ✅ Comprovem el permís per a veure aquesta pàgina
    if (!hasPermission(member?.role, PERMISSIONS.VIEW_BILLING)) {
        // Si no té permís, mostrem un missatge d'accés denegat o redirigim
        return <AccessDenied />;
    }
    return (
        <Suspense fallback={<div>Carregant planificador...</div>}>
            <SocialPlannerClient
                initialPosts={(posts as SocialPost[]) || []}
                connectionStatuses={connectionStatuses}
            />
        </Suspense>
    );
}